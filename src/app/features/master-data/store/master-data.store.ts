import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { MasterDataService } from '../services/master-data';
import {
  Area,
  CreateAreaRequest,
  CreateManagementRequest,
  Management,
  UpdateAreaRequest,
  UpdateManagementRequest,
} from '../../../core/models/master-data.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface MasterDataState {
  status: StoreStatus;
}

const initialState: MasterDataState = {
  status: initialStoreStatus,
};

/**
 * Store de datos maestros. Gestiona operaciones de escritura
 * sobre gerencias y áreas del tenant.
 */
export const MasterDataStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, masterDataService = inject(MasterDataService)) => ({
    /**
     * Crea una nueva gerencia.
     * @param request Datos de la gerencia.
     * @returns Gerencia creada.
     */
    async createManagement(request: CreateManagementRequest): Promise<Management> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(masterDataService.createManagement(request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la gerencia');
        throw error;
      }
    },

    /**
     * Actualiza una gerencia.
     * @param id Identificador de la gerencia.
     * @param request Datos a actualizar.
     * @returns Gerencia actualizada.
     */
    async updateManagement(id: string, request: UpdateManagementRequest): Promise<Management> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(masterDataService.updateManagement(id, request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar la gerencia');
        throw error;
      }
    },

    /**
     * Elimina una gerencia.
     * @param id Identificador de la gerencia.
     */
    async deleteManagement(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(masterDataService.deleteManagement(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar la gerencia');
        throw error;
      }
    },

    /**
     * Crea una nueva área.
     * @param request Datos del área.
     * @returns Área creada.
     */
    async createArea(request: CreateAreaRequest): Promise<Area> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(masterDataService.createArea(request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al crear el área');
        throw error;
      }
    },

    /**
     * Actualiza un área.
     * @param id Identificador del área.
     * @param request Datos a actualizar.
     * @returns Área actualizada.
     */
    async updateArea(id: string, request: UpdateAreaRequest): Promise<Area> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(masterDataService.updateArea(id, request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar el área');
        throw error;
      }
    },

    /**
     * Elimina un área.
     * @param id Identificador del área.
     */
    async deleteArea(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(masterDataService.deleteArea(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar el área');
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
