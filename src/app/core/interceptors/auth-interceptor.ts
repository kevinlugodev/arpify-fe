import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../../features/auth/store/auth.store';

/**
 * Petición de refresh en curso. Se usa para encolar peticiones que fallan
 * con 401 mientras se está refrescando el access token, evitando múltiples
 * llamadas simultáneas a /auth/refresh cuando el backend rota el refresh token.
 */
let pendingRefresh: Promise<void> | null = null;

/**
 * Interceptor HTTP que inyecta el JWT y el identificador de tenant
 * en cada petición. Si una petición protegida responde con 401,
 * intenta refrescar el access token una vez y reintenta la petición
 * original. Si el refresh también falla, cierra la sesión.
 *
 * La petición a /auth/refresh no lleva el access token expirado en el
 * header Authorization, ya que ese endpoint es público y solo requiere
 * el refresh token en el body.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);

  const isRefreshRequest = req.url.includes('/auth/refresh');

  const addAuthHeaders = (request: typeof req) => {
    const token = authStore.getAccessToken();
    const tenantId = authStore.getTenantId();
    const tenantSlug = authStore.getTenantSlug();

    let headers = request.headers;
    if (token && !isRefreshRequest) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    if (tenantId) {
      headers = headers.set('X-Tenant-Id', tenantId);
    } else if (tenantSlug) {
      headers = headers.set('X-Tenant-Slug', tenantSlug);
    }
    return request.clone({ headers });
  };

  return next(addAuthHeaders(req)).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isRefreshRequest) {
        if (!pendingRefresh) {
          pendingRefresh = authStore
            .refreshAccessToken()
            .then(() => undefined)
            .finally(() => {
              pendingRefresh = null;
            });
        }

        return from(pendingRefresh).pipe(
          switchMap(() => next(addAuthHeaders(req))),
          catchError((refreshError) => {
            authStore.signOut();
            return throwError(() => refreshError);
          })
        );
      }

      if (error instanceof HttpErrorResponse && error.status === 401) {
        authStore.signOut();
      }

      return throwError(() => error);
    })
  );
};
