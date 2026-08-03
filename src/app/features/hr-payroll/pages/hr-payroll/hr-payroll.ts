import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import PageHeader from '../../../../shared/components/page-header/page-header';
import WorkflowTip from '../../../../shared/components/workflow-tip/workflow-tip';
import CompensationFormComponent from '../../components/compensation-form/compensation-form';
import CompensationListComponent from '../../components/compensation-list/compensation-list';
import PayrollRunFormComponent from '../../components/payroll-run-form/payroll-run-form';
import PayrollRunListComponent from '../../components/payroll-run-list/payroll-run-list';
import PayrollRunEmployeesComponent from '../../components/payroll-run-employees/payroll-run-employees';
import { EmployeeCompensation, PayrollRun } from '../../../../core/models/hr-payroll.model';
import { HrPayrollService } from '../../services/hr-payroll';
import { TeamsService } from '../../../teams/services/teams';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource } from '../../../../core/utils/resource-helpers';

type HrPayrollTab = 'compensations' | 'payroll-runs';

interface Option<T = string> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-hr-payroll',
  standalone: true,
  imports: [
    PageHeader,
    WorkflowTip,
    CompensationFormComponent,
    CompensationListComponent,
    PayrollRunFormComponent,
    PayrollRunListComponent,
    PayrollRunEmployeesComponent,
  ],
  templateUrl: './hr-payroll.html',
  styleUrl: './hr-payroll.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class HrPayrollPage {
  private readonly teamsService = inject(TeamsService);
  private readonly hrPayrollService = inject(HrPayrollService);

  protected readonly activeTab = signal<HrPayrollTab>('compensations');
  protected readonly compensationReloadTrigger = signal<number>(0);
  protected readonly payrollRunReloadTrigger = signal<number>(0);
  protected readonly editingCompensation = signal<EmployeeCompensation | null>(null);
  protected readonly editingPayrollRun = signal<PayrollRun | null>(null);
  protected readonly selectedPayrollRun = signal<PayrollRun | null>(null);

  private readonly employeesResource = apiResource<Option<string>[]>(async () => {
    try {
      const response = await toApiPromise(this.teamsService.getTeamMembers({ limit: 200 }));
      return response.items.map((member) => ({
        value: member.id,
        label: `${member.first_name} ${member.last_name} (${member.email})`,
      }));
    } catch {
      return [];
    }
  });

  protected readonly employeesOptions = computed<Option<string>[]>(() => this.employeesResource.value() ?? []);
  protected readonly employeesLoading = computed(() => this.employeesResource.isLoading());

  protected onCompensationSaved(): void {
    this.editingCompensation.set(null);
    this.compensationReloadTrigger.update((value) => value + 1);
  }

  protected onCompensationCancelled(): void {
    this.editingCompensation.set(null);
  }

  protected onCompensationEdit(compensation: EmployeeCompensation): void {
    this.editingCompensation.set(compensation);
  }

  protected onPayrollRunSaved(): void {
    this.editingPayrollRun.set(null);
    this.payrollRunReloadTrigger.update((value) => value + 1);
    this.selectedPayrollRun.set(null);
  }

  protected onPayrollRunCancelled(): void {
    this.editingPayrollRun.set(null);
  }

  protected onPayrollRunEdit(payrollRun: PayrollRun): void {
    this.editingPayrollRun.set(payrollRun);
  }

  protected onPayrollRunSelect(payrollRun: PayrollRun): void {
    this.selectedPayrollRun.set(payrollRun);
  }

  protected onPayrollRunChanged(): void {
    this.payrollRunReloadTrigger.update((value) => value + 1);
    const selected = this.selectedPayrollRun();
    if (selected) {
      this.refreshSelectedPayrollRun(selected.id);
    }
  }

  protected onPayrollRunEmployeesChanged(): void {
    this.payrollRunReloadTrigger.update((value) => value + 1);
    const selected = this.selectedPayrollRun();
    if (selected) {
      this.refreshSelectedPayrollRun(selected.id);
    }
  }

  private async refreshSelectedPayrollRun(id: string): Promise<void> {
    try {
      const response = await toApiPromise(this.hrPayrollService.getPayrollRun(id));
      this.selectedPayrollRun.set(response.payroll_run);
    } catch {
      this.selectedPayrollRun.set(null);
    }
  }
}
