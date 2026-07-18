import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { AuditService } from '../services/audit';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';

interface AuditState {
  status: StoreStatus;
}

const initialState: AuditState = {
  status: initialStoreStatus,
};

/**
 * Store de auditoría del tenant.
 * Actualmente solo mantiene estado de carga/error porque las lecturas
 * se realizan mediante Angular `resource` en los componentes.
 */
export const AuditStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    /**
     * Limpia el mensaje de error del store.
     */
    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  }))
);
