import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { FixedAssetsService } from '../services/fixed-assets';
import {
  CreateFixedAssetRequest,
  DepreciateRequest,
  DepreciationLog,
  FixedAsset,
  UpdateFixedAssetRequest,
} from '../../../core/models/fixed-assets.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface FixedAssetsState {
  status: StoreStatus;
}

const initialState: FixedAssetsState = {
  status: initialStoreStatus,
};

/**
 * Store de activos fijos. Gestiona operaciones de escritura sobre activos
 * y depreciaciones.
 */
export const FixedAssetsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, fixedAssetsService = inject(FixedAssetsService)) => ({
    async createFixedAsset(request: CreateFixedAssetRequest): Promise<FixedAsset> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(fixedAssetsService.createFixedAsset(request));
        setStoreSuccess(store);
        return response.fixed_asset;
      } catch (error) {
        setStoreError(store, error, 'Error al crear el activo fijo');
        throw error;
      }
    },

    async updateFixedAsset(id: string, request: UpdateFixedAssetRequest): Promise<FixedAsset> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(fixedAssetsService.updateFixedAsset(id, request));
        setStoreSuccess(store);
        return response.fixed_asset;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar el activo fijo');
        throw error;
      }
    },

    async deleteFixedAsset(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(fixedAssetsService.deleteFixedAsset(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar el activo fijo');
        throw error;
      }
    },

    async depreciate(id: string, request: DepreciateRequest): Promise<DepreciationLog> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(fixedAssetsService.depreciate(id, request));
        setStoreSuccess(store);
        return response.log;
      } catch (error) {
        setStoreError(store, error, 'Error al ejecutar la depreciación');
        throw error;
      }
    },

    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  })),
);
