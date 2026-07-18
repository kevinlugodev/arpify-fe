import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { MeService } from '../services/me';
import { ChangePasswordRequest, UpdateProfileRequest } from '../../../core/models/user.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface MeState {
  status: StoreStatus;
}

const initialState: MeState = {
  status: initialStoreStatus,
};

/**
 * Store de "Mi Cuenta". Gestiona operaciones de escritura
 * sobre el perfil y la seguridad del usuario autenticado.
 */
export const MeStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, meService = inject(MeService)) => ({
    /**
     * Actualiza el perfil del usuario autenticado.
     * @param request Datos a actualizar.
     */
    async updateProfile(request: UpdateProfileRequest): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(meService.updateProfile(request));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar el perfil');
        throw error;
      }
    },

    /**
     * Cambia la contraseña del usuario autenticado.
     * @param request Contraseña actual y nueva contraseña.
     */
    async changePassword(request: ChangePasswordRequest): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(meService.changePassword(request));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al cambiar la contraseña');
        throw error;
      }
    },

    /**
     * Limpia el mensaje de error del store.
     */
    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  }))
);
