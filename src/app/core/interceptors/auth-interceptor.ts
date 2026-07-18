import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../../features/auth/store/auth.store';

/**
 * Interceptor HTTP que inyecta el JWT y el identificador de tenant
 * en cada petición. Si una petición protegida responde con 401,
 * intenta refrescar el access token una vez y reintenta la petición
 * original. Si el refresh también falla, cierra la sesión.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);

  const isRefreshRequest = req.url.includes('/auth/refresh');

  const addAuthHeaders = (request: typeof req) => {
    const token = authStore.getAccessToken();
    const tenantId = authStore.getTenantId();
    const tenantSlug = authStore.getTenantSlug();

    let headers = request.headers;
    if (token) {
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
        return from(authStore.refreshAccessToken()).pipe(
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
