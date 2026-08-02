import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { HrPayrollService } from '../services/hr-payroll';
import {
  AddEmployeeToPayrollRunRequest,
  CreateEmployeeCompensationRequest,
  CreatePayrollRunRequest,
  EmployeeCompensation,
  PayrollItem,
  PayrollRun,
  UpdateEmployeeCompensationRequest,
  UpdatePayrollRunRequest,
} from '../../../core/models/hr-payroll.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface HrPayrollState {
  status: StoreStatus;
}

const initialState: HrPayrollState = {
  status: initialStoreStatus,
};

/**
 * Store de planillas (HR Payroll). Gestiona operaciones de escritura sobre
 * compensaciones, planillas mensuales y empleados dentro de una planilla.
 */
export const HrPayrollStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, hrPayrollService = inject(HrPayrollService)) => ({
    // --- Compensations ---

    async createCompensation(request: CreateEmployeeCompensationRequest): Promise<EmployeeCompensation> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(hrPayrollService.createCompensation(request));
        setStoreSuccess(store);
        return response.compensation;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la compensación');
        throw error;
      }
    },

    async updateCompensation(id: string, request: UpdateEmployeeCompensationRequest): Promise<EmployeeCompensation> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(hrPayrollService.updateCompensation(id, request));
        setStoreSuccess(store);
        return response.compensation;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar la compensación');
        throw error;
      }
    },

    async deleteCompensation(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(hrPayrollService.deleteCompensation(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar la compensación');
        throw error;
      }
    },

    // --- Payroll Runs ---

    async createPayrollRun(request: CreatePayrollRunRequest): Promise<PayrollRun> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(hrPayrollService.createPayrollRun(request));
        setStoreSuccess(store);
        return response.payroll_run;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la planilla');
        throw error;
      }
    },

    async updatePayrollRun(id: string, request: UpdatePayrollRunRequest): Promise<PayrollRun> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(hrPayrollService.updatePayrollRun(id, request));
        setStoreSuccess(store);
        return response.payroll_run;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar la planilla');
        throw error;
      }
    },

    async deletePayrollRun(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(hrPayrollService.deletePayrollRun(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar la planilla');
        throw error;
      }
    },

    // --- Payroll Run Employees ---

    async addEmployeeToPayrollRun(id: string, request: AddEmployeeToPayrollRunRequest): Promise<PayrollItem> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(hrPayrollService.addEmployeeToPayrollRun(id, request));
        setStoreSuccess(store);
        return response.item;
      } catch (error) {
        setStoreError(store, error, 'Error al agregar el colaborador a la planilla');
        throw error;
      }
    },

    async removeEmployeeFromPayrollRun(id: string, employeeId: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(hrPayrollService.removeEmployeeFromPayrollRun(id, employeeId));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al quitar el colaborador de la planilla');
        throw error;
      }
    },

    // --- Payroll Run Transitions ---

    async approvePayrollRun(id: string): Promise<PayrollRun> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(hrPayrollService.approvePayrollRun(id));
        setStoreSuccess(store);
        return response.payroll_run;
      } catch (error) {
        setStoreError(store, error, 'Error al aprobar la planilla');
        throw error;
      }
    },

    async cancelPayrollRun(id: string): Promise<PayrollRun> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(hrPayrollService.cancelPayrollRun(id));
        setStoreSuccess(store);
        return response.payroll_run;
      } catch (error) {
        setStoreError(store, error, 'Error al cancelar la planilla');
        throw error;
      }
    },

    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  }))
);
