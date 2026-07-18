import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../../features/auth/store/auth.store';

/**
 * Guard de autenticación. Permite el acceso solo si existe una sesión activa.
 */
export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/signin']);
};
