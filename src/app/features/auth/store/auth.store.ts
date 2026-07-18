import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { AuthService } from '../services/auth';
import {
  AuthenticatedUser,
  RecoverPasswordRequest,
  ResetPasswordRequest,
  SignInRequest,
  VerifyCodeRequest,
} from '../../../core/models/auth.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { ApiError, toApiPromise } from '../../../core/utils/api-response';
import { getErrorMessage, setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

const ACCESS_TOKEN_KEY = 'arpify_access_token';
const REFRESH_TOKEN_KEY = 'arpify_refresh_token';
const TENANT_ID_KEY = 'arpify_tenant_id';
const TENANT_SLUG_KEY = 'arpify_tenant_slug';

interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenantId: string | null;
  tenantSlug: string | null;
  status: StoreStatus;
}

function loadFromStorage(key: string): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem(key);
}

function saveToStorage(key: string, value: string | null): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  if (value) {
    localStorage.setItem(key, value);
  } else {
    localStorage.removeItem(key);
  }
}

const initialState: AuthState = {
  user: null,
  accessToken: loadFromStorage(ACCESS_TOKEN_KEY),
  refreshToken: loadFromStorage(REFRESH_TOKEN_KEY),
  tenantId: loadFromStorage(TENANT_ID_KEY),
  tenantSlug: loadFromStorage(TENANT_SLUG_KEY),
  status: initialStoreStatus,
};

/**
 * Store global de autenticación y sesión.
 * Centraliza tokens, datos del usuario autenticado y tenant activo.
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ accessToken, user }) => ({
    /** Indica si existe un access token activo. */
    isAuthenticated: computed(() => !!accessToken()),
    /** Rol del usuario autenticado, o null si no hay sesión. */
    userRole: computed(() => user()?.role ?? null),
  })),
  withMethods((store, authService = inject(AuthService)) => ({
    /**
     * Inicia sesión con credenciales y persiste la sesión resultante.
     * @param request Email y contraseña del usuario.
     */
    async signIn(request: SignInRequest): Promise<void> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(authService.signIn(request));
        patchState(store, {
          user: response.user,
          accessToken: response.token_pair.access_token,
          refreshToken: response.token_pair.refresh_token,
          tenantId: response.user.tenant_id,
          status: { loading: false, error: null },
        });
        saveToStorage(ACCESS_TOKEN_KEY, response.token_pair.access_token);
        saveToStorage(REFRESH_TOKEN_KEY, response.token_pair.refresh_token);
        saveToStorage(TENANT_ID_KEY, response.user.tenant_id);
      } catch (error) {
        setStoreError(store, error, 'Error al iniciar sesión');
        throw error;
      }
    },

    /**
     * Cierra la sesión local limpiando tokens y datos de usuario.
     */
    signOut(): void {
      patchState(store, {
        user: null,
        accessToken: null,
        refreshToken: null,
        tenantId: null,
        tenantSlug: null,
        status: initialStoreStatus,
      });
      saveToStorage(ACCESS_TOKEN_KEY, null);
      saveToStorage(REFRESH_TOKEN_KEY, null);
      saveToStorage(TENANT_ID_KEY, null);
      saveToStorage(TENANT_SLUG_KEY, null);
    },

    /**
     * Solicita el envío de un código de recuperación de contraseña.
     * @param request Email del usuario.
     */
    async recoverPassword(request: RecoverPasswordRequest): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(authService.recoverPassword(request));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al enviar el código');
        throw error;
      }
    },

    /**
     * Verifica el código de recuperación de contraseña.
     * @param request Email y código.
     */
    async verifyCode(request: VerifyCodeRequest): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(authService.verifyCode(request));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Código inválido');
        throw error;
      }
    },

    /**
     * Restablece la contraseña con el código verificado.
     * @param request Email, código y nueva contraseña.
     */
    async resetPassword(request: ResetPasswordRequest): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(authService.resetPassword(request));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al restablecer la contraseña');
        throw error;
      }
    },

    /**
     * Refresca el access token usando el refresh token almacenado.
     */
    async refreshAccessToken(): Promise<void> {
      const refreshToken = store.refreshToken();
      if (!refreshToken) {
        throw new ApiError('missing_refresh_token', 'No hay sesión activa');
      }
      setStoreLoading(store);
      try {
        const response = await toApiPromise(authService.refreshToken({ refresh_token: refreshToken }));
        patchState(store, {
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          status: { loading: false, error: null },
        });
        saveToStorage(ACCESS_TOKEN_KEY, response.access_token);
        saveToStorage(REFRESH_TOKEN_KEY, response.refresh_token);
      } catch (error) {
        setStoreError(store, error, 'Error al refrescar la sesión');
        throw error;
      }
    },

    /**
     * Establece el slug del tenant antes de iniciar sesión.
     * @param slug Identificador textual del tenant.
     */
    setTenantSlug(slug: string): void {
      patchState(store, { tenantSlug: slug });
      saveToStorage(TENANT_SLUG_KEY, slug);
    },

    /**
     * Limpia el slug de tenant previo.
     */
    clearTenantSlug(): void {
      patchState(store, { tenantSlug: null });
      saveToStorage(TENANT_SLUG_KEY, null);
    },

    /**
     * Obtiene el access token actual.
     * Útil para interceptores que no pueden consumir señales directamente.
     */
    getAccessToken(): string | null {
      return store.accessToken();
    },

    /**
     * Obtiene el refresh token actual.
     */
    getRefreshToken(): string | null {
      return store.refreshToken();
    },

    /**
     * Obtiene el ID del tenant actual.
     */
    getTenantId(): string | null {
      return store.tenantId();
    },

    /**
     * Obtiene el slug del tenant actual.
     */
    getTenantSlug(): string | null {
      return store.tenantSlug();
    },

    /**
     * Limpia el mensaje de error del store.
     */
    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  }))
);
