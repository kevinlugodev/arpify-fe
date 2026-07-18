import { patchState } from '@ngrx/signals';
import { ApiError } from './api-response';
import { StoreStatus } from './store-status';

/**
 * Actualiza el estado de un store al inicio de una operación asíncrona.
 * Limpia errores previos y marca loading en true.
 */
export function setStoreLoading(store: object): void {
  patchState(store as never, (state: { status: StoreStatus }) => ({
    status: { ...state.status, loading: true, error: null },
  }));
}

/**
 * Actualiza el estado de un store al finalizar una operación asíncrona exitosamente.
 */
export function setStoreSuccess(store: object): void {
  patchState(store as never, (state: { status: StoreStatus }) => ({
    status: { ...state.status, loading: false, error: null },
  }));
}

/**
 * Actualiza el estado de un store ante un error en una operación asíncrona.
 * @param error Error capturado.
 * @param fallbackMessage Mensaje por defecto si el error no es un ApiError.
 */
export function setStoreError(store: object, error: unknown, fallbackMessage: string): void {
  const message = error instanceof ApiError ? error.message : fallbackMessage;
  patchState(store as never, (state: { status: StoreStatus }) => ({
    status: { ...state.status, loading: false, error: message },
  }));
}

/**
 * Extrae un mensaje legible de un error desconocido.
 * @param error Error capturado.
 * @param fallbackMessage Mensaje por defecto.
 */
export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof ApiError ? error.message : fallbackMessage;
}
