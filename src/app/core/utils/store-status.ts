/**
 * Estado de carga/error reutilizable para signalStores.
 */
export interface StoreStatus {
  /** Indica si el store está ejecutando una operación asíncrona. */
  loading: boolean;
  /** Mensaje de error de la última operación, o null si no hay error. */
  error: string | null;
}

/**
 * Estado inicial por defecto para cualquier store.
 */
export const initialStoreStatus: StoreStatus = {
  loading: false,
  error: null,
};
