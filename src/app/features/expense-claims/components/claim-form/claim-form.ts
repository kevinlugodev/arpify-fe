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
import {
  CreateExpenseClaimRequest,
  ExpenseClaim,
  UpdateExpenseClaimRequest,
} from '../../../../core/models/expense-claims.model';
import { TeamMember } from '../../../../core/models/team.model';
import { ExpenseClaimsStore } from '../../store/expense-claims.store';

interface Option<T = string> {
  value: T;
  label: string;
}

interface ClaimFormModel {
  claim_number: string;
  employee_id: string;
  title: string;
  purpose: string;
  total_advanced: string;
}

const EMPTY_CLAIM: ClaimFormModel = {
  claim_number: '',
  employee_id: '',
  title: '',
  purpose: '',
  total_advanced: '',
};

@Component({
  selector: 'app-claim-form',
  standalone: true,
  imports: [FormField, FluentTextInput, FluentDropdown],
  templateUrl: './claim-form.html',
  styleUrl: './claim-form.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ClaimFormComponent {
  private readonly expenseClaimsStore = inject(ExpenseClaimsStore);

  readonly claim = input<ExpenseClaim | null>(null);
  readonly employees = input.required<TeamMember[]>();

  readonly saved = output<void>();
  readonly cancel = output<void>();

  protected readonly claimModel = signal<ClaimFormModel>({ ...EMPTY_CLAIM });
  protected readonly claimForm;

  protected readonly saving = computed(() => this.expenseClaimsStore.status().loading);

  protected readonly employeeOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Selecciona un colaborador' },
    ...this.employees().map((employee) => ({
      value: employee.id,
      label: `${employee.first_name} ${employee.last_name}`,
    })),
  ]);

  protected readonly isEditing = computed(() => !!this.claim());
  protected readonly isReadonly = computed(() => {
    const claim = this.claim();
    return claim ? claim.status !== 'DRAFT' : false;
  });

  protected getEmployeeName(id: string): string {
    const employee = this.employees().find((e) => e.id === id);
    return employee ? `${employee.first_name} ${employee.last_name}` : id;
  }

  constructor() {
    this.claimForm = form(this.claimModel, (schema) => {
      required(schema.claim_number, { message: 'El número de rendición es obligatorio.' });
      required(schema.employee_id, { message: 'El colaborador es obligatorio.' });
      required(schema.title, { message: 'El título es obligatorio.' });
      required(schema.total_advanced, { message: 'El monto adelantado es obligatorio.' });
    });

    effect(() => {
      const claim = this.claim();
      if (claim) {
        this.claimModel.set({
          claim_number: claim.claim_number,
          employee_id: claim.employee_id,
          title: claim.title,
          purpose: claim.purpose ?? '',
          total_advanced: String(claim.total_advanced),
        });
      } else {
        this.claimModel.set({ ...EMPTY_CLAIM });
      }
    });
  }

  protected async onSubmit(): Promise<void> {
    this.claimForm().markAsTouched();
    if (this.claimForm().invalid()) {
      toast.error('Completa los campos obligatorios de la rendición');
      return;
    }

    const model = this.claimModel();
    const editingClaim = this.claim();

    try {
      if (editingClaim) {
        const request: UpdateExpenseClaimRequest = {
          title: model.title,
          purpose: model.purpose || undefined,
        };
        await this.expenseClaimsStore.updateExpenseClaim(editingClaim.id, request);
        toast.success('Rendición actualizada');
      } else {
        const request: CreateExpenseClaimRequest = {
          claim_number: model.claim_number,
          employee_id: model.employee_id,
          title: model.title,
          purpose: model.purpose || undefined,
          total_advanced: Number(model.total_advanced || 0),
        };
        await this.expenseClaimsStore.createExpenseClaim(request);
        toast.success('Rendición creada');
      }
      this.saved.emit();
    } catch {
      toast.error(this.expenseClaimsStore.status().error ?? 'Error al guardar la rendición');
    }
  }

  protected onCancel(): void {
    this.cancel.emit();
  }
}
