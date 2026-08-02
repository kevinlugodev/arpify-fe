import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import {
  AddEmployeeToPayrollRunRequest,
  PayrollItem,
  PayrollRun,
} from '../../../../core/models/hr-payroll.model';
import { HrPayrollService } from '../../services/hr-payroll';
import { HrPayrollStore } from '../../store/hr-payroll.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface Option<T = string> {
  value: T;
  label: string;
}

interface AddEmployeeFormModel {
  employee_id: string;
  other_deductions: string;
}

const EMPTY_ADD_EMPLOYEE: AddEmployeeFormModel = {
  employee_id: '',
  other_deductions: '0',
};

@Component({
  selector: 'app-payroll-run-employees',
  standalone: true,
  imports: [DecimalPipe, DataTable, EmptyState, ConfirmDialog, FormField, FluentTextInput, FluentDropdown],
  templateUrl: './payroll-run-employees.html',
  styleUrl: './payroll-run-employees.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class PayrollRunEmployeesComponent {
  private readonly hrPayrollService = inject(HrPayrollService);
  private readonly hrPayrollStore = inject(HrPayrollStore);

  readonly payrollRun = input.required<PayrollRun>();
  readonly employeesOptions = input.required<Option<string>[]>();

  readonly changed = output<void>();

  private readonly removeDialog = viewChild<ConfirmDialog>('removeDialog');
  protected readonly itemToRemove = signal<PayrollItem | null>(null);

  protected readonly addEmployeeModel = signal<AddEmployeeFormModel>({ ...EMPTY_ADD_EMPLOYEE });
  protected addEmployeeForm;

  private readonly itemsResource = apiResourceWithRequest<PayrollItem[], string>(
    () => this.payrollRun().id,
    async ({ params }) => {
      try {
        const response = await toApiPromise(this.hrPayrollService.getPayrollRunItems(params, 200));
        return response.items;
      } catch {
        toast.error('Error al cargar colaboradores de la planilla');
        return [];
      }
    }
  );

  protected readonly items = computed<PayrollItem[]>(() => this.itemsResource.value() ?? []);
  protected readonly itemsLoading = computed(() => this.itemsResource.isLoading());
  protected readonly saving = computed(() => this.hrPayrollStore.status().loading);
  protected readonly isDraft = computed(() => this.payrollRun().status === 'DRAFT');

  protected readonly columns: DataTableColumn<PayrollItem & { employee_name: string }>[] = [
    { key: 'employee_name', header: 'Colaborador' },
    { key: 'base_salary', header: 'Salario base' },
    { key: 'gross_earnings', header: 'Bruto' },
    { key: 'pension_deduction', header: 'Pensión' },
    { key: 'other_deductions', header: 'Otros desc.' },
    { key: 'employer_essalud', header: 'EsSalud' },
    { key: 'net_payable', header: 'Neto' },
    { key: 'payment_status', header: 'Estado pago', type: 'status', statusDomain: 'payroll-payment-status' },
  ];

  protected readonly removeAction: DataTableAction<PayrollItem>[] = [
    { key: 'remove', label: 'Quitar', icon: 'bi-trash' },
  ];

  protected readonly rowData = computed(() =>
    this.items().map((item) => ({
      ...item,
      employee_name: this.getEmployeeName(item.employee_id),
    }))
  );

  constructor() {
    this.addEmployeeForm = form(this.addEmployeeModel, (schema) => {
      required(schema.employee_id, { message: 'El colaborador es obligatorio.' });
    });

    effect(() => {
      const payrollRun = this.payrollRun();
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      payrollRun;
      this.addEmployeeModel.set({ ...EMPTY_ADD_EMPLOYEE });
      this.itemsResource.reload();
    });
  }

  private getEmployeeName(employeeId: string): string {
    return this.employeesOptions().find((option) => option.value === employeeId)?.label ?? employeeId;
  }

  protected getAvailableEmployeeOptions(): Option<string>[] {
    const currentEmployeeIds = new Set(this.items().map((item) => item.employee_id));
    return [
      { value: '', label: 'Selecciona...' },
      ...this.employeesOptions().filter((option) => option.value && !currentEmployeeIds.has(option.value)),
    ];
  }

  protected async onAddEmployee(): Promise<void> {
    if (!this.isDraft()) {
      toast.error('Solo se pueden modificar planillas en borrador');
      return;
    }

    this.addEmployeeForm().markAsTouched();
    if (this.addEmployeeForm().invalid()) {
      toast.error('Selecciona un colaborador');
      return;
    }

    const model = this.addEmployeeModel();
    const request: AddEmployeeToPayrollRunRequest = {
      employee_id: model.employee_id,
      other_deductions: Number(model.other_deductions || 0),
    };

    try {
      await this.hrPayrollStore.addEmployeeToPayrollRun(this.payrollRun().id, request);
      toast.success('Colaborador agregado a la planilla');
      this.addEmployeeModel.set({ ...EMPTY_ADD_EMPLOYEE });
      this.itemsResource.reload();
      this.changed.emit();
    } catch {
      toast.error(this.hrPayrollStore.status().error ?? 'Error al agregar el colaborador');
    }
  }

  protected onAction(event: { action: string; row: PayrollItem }): void {
    if (event.action === 'remove') {
      if (!this.isDraft()) {
        toast.error('Solo se pueden modificar planillas en borrador');
        return;
      }
      this.itemToRemove.set(event.row);
      this.removeDialog()?.open();
    }
  }

  protected async onConfirmRemove(): Promise<void> {
    const item = this.itemToRemove();
    if (!item) {
      return;
    }

    try {
      await this.hrPayrollStore.removeEmployeeFromPayrollRun(this.payrollRun().id, item.employee_id);
      toast.success('Colaborador quitado de la planilla');
      this.itemToRemove.set(null);
      this.itemsResource.reload();
      this.changed.emit();
    } catch {
      toast.error(this.hrPayrollStore.status().error ?? 'Error al quitar el colaborador');
    }
  }
}
