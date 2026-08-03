import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  RecoverPasswordRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ResetPasswordRequest,
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  SignUpResponse,
  VerifyCodeRequest,
} from '../../../core/models/auth.model';

/**
 * Servicio de autenticación. Expone únicamente operaciones HTTP.
 * La gestión de sesión (tokens, tenant) vive en `AuthStore`.
 */
@Service()
export class AuthService {
  private readonly api = inject(Api);

  /**
   * Inicia sesión con email y contraseña.
   * @param request Credenciales del usuario.
   */
  signIn(request: SignInRequest): Observable<ApiResponse<SignInResponse>> {
    return this.api.post<SignInResponse>('auth/signin', request);
  }

  /**
   * Crea una nueva cuenta de empresa (tenant) y su usuario OWNER.
   * @param request Datos de registro.
   */
  signUp(request: SignUpRequest): Observable<ApiResponse<SignUpResponse>> {
    return this.api.post<SignUpResponse>('auth/signup', request);
  }

  /**
   * Refresca el access token usando el refresh token.
   * @param request Refresh token actual.
   */
  refreshToken(request: RefreshTokenRequest): Observable<ApiResponse<RefreshTokenResponse>> {
    return this.api.post<RefreshTokenResponse>('auth/refresh', request);
  }

  /**
   * Solicita el envío de un código de recuperación de contraseña.
   * @param request Email del usuario.
   */
  recoverPassword(request: RecoverPasswordRequest): Observable<ApiResponse<unknown>> {
    return this.api.post<unknown>('auth/password/recover', request);
  }

  /**
   * Verifica el código de recuperación.
   * @param request Email y código.
   */
  verifyCode(request: VerifyCodeRequest): Observable<ApiResponse<unknown>> {
    return this.api.post<unknown>('auth/password/verify-code', request);
  }

  /**
   * Restablece la contraseña con el código verificado.
   * @param request Email, código y nueva contraseña.
   */
  resetPassword(request: ResetPasswordRequest): Observable<ApiResponse<unknown>> {
    return this.api.post<unknown>('auth/password/reset', request);
  }
}
