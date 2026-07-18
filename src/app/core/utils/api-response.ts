import { lastValueFrom, Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

/**
 * Error estandarizado para operaciones de API.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Convierte una respuesta de API basada en Observable a una Promise que resuelve
 * el payload `data` o rechaza con un `ApiError`.
 *
 * @param source Observable que emite un `ApiResponse<T>`.
 * @returns Promise con el valor de `data` cuando la operación es exitosa.
 */
export async function toApiPromise<T>(source: Observable<ApiResponse<T>>): Promise<T> {
  try {
    const response = await lastValueFrom(source);

    if (response.success) {
      return response.data;
    }

    throw new ApiError(response.error?.code ?? 'unknown', response.error?.message ?? 'Error desconocido');
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const networkError = error as { error?: { error?: { code?: string; message?: string } }; message?: string };
    const code = networkError?.error?.error?.code ?? 'network_error';
    const message = networkError?.error?.error?.message ?? networkError?.message ?? 'Error de conexión';
    throw new ApiError(code, message);
  }
}
