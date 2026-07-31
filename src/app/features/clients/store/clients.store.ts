import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { ClientsService } from '../services/clients';
import { CreateCustomerRequest, Customer, UpdateCustomerRequest } from '../../../core/models/clients.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface ClientsState {
  status: StoreStatus;
}

const initialState: ClientsState = {
  status: initialStoreStatus,
};

/**
 * Store de clientes. Gestiona operaciones de escritura sobre clientes.
 */
export const ClientsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, clientsService = inject(ClientsService)) => ({
    /**
     * Crea un nuevo cliente.
     */
    async createCustomer(request: CreateCustomerRequest): Promise<Customer> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(clientsService.createCustomer(request));
        setStoreSuccess(store);
        return response.customer;
      } catch (error) {
        setStoreError(store, error, 'Error al crear el cliente');
        throw error;
      }
    },

    /**
     * Actualiza un cliente existente.
     */
    async updateCustomer(id: string, request: UpdateCustomerRequest): Promise<Customer> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(clientsService.updateCustomer(id, request));
        setStoreSuccess(store);
        return response.customer;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar el cliente');
        throw error;
      }
    },

    /**
     * Elimina un cliente.
     */
    async deleteCustomer(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(clientsService.deleteCustomer(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar el cliente');
        throw error;
      }
    },

    /**
     * Limpia el mensaje de error del store.
     */
    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  })),
);
