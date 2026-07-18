import { resource, ResourceLoader, ResourceRef } from '@angular/core';

/**
 * Crea un Angular `resource` a partir de un loader que retorna una Promise.
 * Útil para lecturas de API sin manejar subscriptions manualmente.
 *
 * @param loader Función asíncrona que retorna los datos.
 * @returns ResourceRef con el estado de la carga y los datos.
 */
export function apiResource<T>(loader: () => Promise<T>): ResourceRef<T | undefined> {
  return resource<T, unknown>({
    loader: () => loader(),
  });
}

/**
 * Crea un Angular `resource` con dependencias reactivas.
 * El loader se reejecuta cuando cambien las señales usadas dentro de `params`.
 *
 * @param params Función que retorna un objeto de dependencias.
 * @param loader Función asíncrona que recibe los params y retorna los datos.
 * @returns ResourceRef con el estado de la carga y los datos.
 */
export function apiResourceWithRequest<T, R>(
  params: () => R,
  loader: (params: { params: R }) => Promise<T>
): ResourceRef<T | undefined> {
  return resource<T, R>({
    params,
    loader: loader as ResourceLoader<T, R>,
  });
}
