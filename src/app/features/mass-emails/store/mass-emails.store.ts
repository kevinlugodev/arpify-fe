import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { MassEmailsService } from '../services/mass-emails';
import {
  Campaign,
  CreateCampaignRequest,
  CreateEmailTemplateRequest,
  EmailTemplate,
  PreviewTemplateRequest,
} from '../../../core/models/mass-email.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface MassEmailsState {
  status: StoreStatus;
}

const initialState: MassEmailsState = {
  status: initialStoreStatus,
};

/**
 * Store de correos masivos. Gestiona operaciones de escritura
 * sobre plantillas, campañas y previsualizaciones.
 */
export const MassEmailsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, massEmailsService = inject(MassEmailsService)) => ({
    /**
     * Crea una plantilla de correo.
     * @param request Datos de la plantilla.
     * @returns Plantilla creada.
     */
    async createTemplate(request: CreateEmailTemplateRequest): Promise<EmailTemplate> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(massEmailsService.createTemplate(request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la plantilla');
        throw error;
      }
    },

    /**
     * Previsualiza una plantilla renderizada.
     * @param id Identificador de la plantilla.
     * @param request Datos para renderizar.
     * @returns HTML renderizado.
     */
    async previewTemplate(id: string, request: PreviewTemplateRequest): Promise<string> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(massEmailsService.previewTemplate(id, request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al previsualizar la plantilla');
        throw error;
      }
    },

    /**
     * Crea una campaña de correos.
     * @param request Datos de la campaña.
     * @returns Campaña creada.
     */
    async createCampaign(request: CreateCampaignRequest): Promise<Campaign> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(massEmailsService.createCampaign(request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la campaña');
        throw error;
      }
    },

    /**
     * Ejecuta manualmente una campaña.
     * @param id Identificador de la campaña.
     */
    async runCampaign(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(massEmailsService.runCampaign(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al ejecutar la campaña');
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
