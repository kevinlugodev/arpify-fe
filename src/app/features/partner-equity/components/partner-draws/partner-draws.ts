import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import WorkflowTip from '../../../../shared/components/workflow-tip/workflow-tip';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { BankAccount } from '../../../../core/models/treasury.model';
import { PartnerAccount, PartnerDrawTransaction } from '../../../../core/models/partner-equity.model';
import { TeamMember } from '../../../../core/models/team.model';
import { PartnerEquityStore } from '../../store/partner-equity.store';

type DrawOperation = 'advance' | 'settlement' | null;

interface DrawTransactionRow extends PartnerDrawTransaction {
  partner_name: string;
  employee_name: string;
}

interface AdvanceFormModel {
  partner_account_id: string;
  bank_account_id: string;
  amount: string;
}

interface SettlementFormModel {
  partner_account_id: string;
  rhe_document_number: string;
  amount: string;
  notes: string;
}

const EMPTY_ADVANCE: AdvanceFormModel = {
  partner_account_id: '',
  bank_account_id: '',
  amount: '',
};

const EMPTY_SETTLEMENT: SettlementFormModel = {
  partner_account_id: '',
  rhe_document_number: '',
  amount: '',
  notes: '',
};

@Component({
  selector: 'app-partner-draws',
  standalone: true,
  imports: [
    DecimalPipe,
    DataTable,
    EmptyState,
    InfoTip,
    WorkflowTip,
    FormField,
    FluentTextInput,
    FluentDropdown,
  ],
  templateUrl: './partner-draws.html',
  styleUrl: './partner-draws.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class PartnerDrawsComponent {
  private readonly partnerEquityStore = inject(PartnerEquityStore);

  readonly accounts = input.required<PartnerAccount[]>();
  readonly bankAccounts = input.required<BankAccount[]>();
  readonly teamMembers = input.required<TeamMember[]>();
  readonly transactions = input.required<PartnerDrawTransaction[]>();
  readonly loading = input<boolean>(false);

  readonly reload = output<void>();

  protected readonly activeOperation = signal<DrawOperation>(null);

  protected readonly advanceModel = signal<AdvanceFormModel>({ ...EMPTY_ADVANCE });
  protected readonly advanceForm;

  protected readonly settlementModel = signal<SettlementFormModel>({ ...EMPTY_SETTLEMENT });
  protected readonly settlementForm;

  protected readonly partnerOptions = computed<{ value: string; label: string }[]>(() => [
    { value: '', label: 'Selecciona un socio' },
    ...this.accounts().map((account) => ({
      value: account.id,
      label: `${this.getEmployeeName(account.partner_employee_id)} — Disponible: ${account.current_available_balance}`,
    })),
  ]);

  protected readonly bankAccountOptions = computed<{ value: string; label: string }[]>(() => [
    { value: '', label: 'Selecciona una cuenta bancaria' },
    ...this.bankAccounts()
      .filter((account) => account.is_active)
      .map((account) => ({
        value: account.id,
        label: `${account.name} (${account.currency})`,
      })),
  ]);

  protected readonly selectedAccount = computed<PartnerAccount | undefined>(() =>
    this.accounts().find((account) => account.id === this.advanceModel().partner_account_id)
  );

  protected readonly transactionRows = computed<DrawTransactionRow[]>(() =>
    this.transactions().map((transaction) => {
      const account = this.accounts().find((a) => a.id === transaction.partner_account_id);
      return {
        ...transaction,
        partner_name: account ? this.getEmployeeName(account.partner_employee_id) : transaction.partner_account_id,
        employee_name: account ? this.getEmployeeName(account.partner_employee_id) : transaction.partner_account_id,
      };
    })
  );

  protected readonly saving = computed(() => this.partnerEquityStore.status().loading);

  protected readonly transactionColumns: DataTableColumn<DrawTransactionRow>[] = [
    { key: 'type', header: 'Tipo', type: 'status', statusDomain: 'partner-draw-type' },
    { key: 'partner_name', header: 'Socio' },
    { key: 'amount', header: 'Monto' },
    { key: 'rhe_document_number', header: 'RHE' },
    { key: 'notes', header: 'Notas' },
    { key: 'created_at', header: 'Fecha' },
  ];

  protected readonly transactionActions: DataTableAction<DrawTransactionRow>[] = [];

  constructor() {
    this.advanceForm = form(this.advanceModel, (schema) => {
      required(schema.partner_account_id, { message: 'El socio es obligatorio.' });
      required(schema.bank_account_id, { message: 'La cuenta bancaria es obligatoria.' });
      required(schema.amount, { message: 'El monto es obligatorio.' });
    });

    this.settlementForm = form(this.settlementModel, (schema) => {
      required(schema.partner_account_id, { message: 'El socio es obligatorio.' });
      required(schema.rhe_document_number, { message: 'El número de RHE es obligatorio.' });
      required(schema.amount, { message: 'El monto es obligatorio.' });
    });
  }

  protected setOperation(operation: DrawOperation): void {
    this.activeOperation.set(operation);
    this.advanceModel.set({ ...EMPTY_ADVANCE });
    this.settlementModel.set({ ...EMPTY_SETTLEMENT });
  }

  protected async onAdvanceSubmit(): Promise<void> {
    this.advanceForm().markAsTouched();
    if (this.advanceForm().invalid()) {
      toast.error('Completa los campos obligatorios del adelanto');
      return;
    }

    const model = this.advanceModel();
    const amount = Number(model.amount);
    const account = this.accounts().find((a) => a.id === model.partner_account_id);

    if (!account) {
      return;
    }
    if (amount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }
    if (amount > account.current_available_balance) {
      toast.error('El monto supera el saldo disponible del socio');
      return;
    }

    try {
      await this.partnerEquityStore.createAdvanceDraw(account.id, {
        bank_account_id: model.bank_account_id,
        amount,
      });
      toast.success('Adelanto registrado');
      this.advanceModel.set({ ...EMPTY_ADVANCE });
      this.activeOperation.set(null);
      this.reload.emit();
    } catch {
      toast.error(this.partnerEquityStore.status().error ?? 'Error al registrar el adelanto');
    }
  }

  protected async onSettlementSubmit(): Promise<void> {
    this.settlementForm().markAsTouched();
    if (this.settlementForm().invalid()) {
      toast.error('Completa los campos obligatorios de la liquidación');
      return;
    }

    const model = this.settlementModel();
    const amount = Number(model.amount);
    const account = this.accounts().find((a) => a.id === model.partner_account_id);

    if (!account) {
      return;
    }
    if (amount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    try {
      await this.partnerEquityStore.createSettlementPayment(account.id, {
        rhe_document_number: model.rhe_document_number,
        amount,
        notes: model.notes || undefined,
      });
      toast.success('Liquidación RHE registrada');
      this.settlementModel.set({ ...EMPTY_SETTLEMENT });
      this.activeOperation.set(null);
      this.reload.emit();
    } catch {
      toast.error(this.partnerEquityStore.status().error ?? 'Error al registrar la liquidación');
    }
  }

  private getEmployeeName(id: string): string {
    const member = this.teamMembers().find((m) => m.id === id);
    return member ? `${member.first_name} ${member.last_name}` : id;
  }
}
