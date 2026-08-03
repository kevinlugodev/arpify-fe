export interface SignInRequest {
  email: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthenticatedUser {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_sign_in_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignInResponse {
  token_pair: TokenPair;
  user: AuthenticatedUser;
}

export interface SignUpRequest {
  email: string;
  password: string;
  company_name: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
}

export interface SignUpResponse {
  token_pair: TokenPair;
  user: AuthenticatedUser;
  tenant: TenantInfo;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RecoverPasswordRequest {
  email: string;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  new_password: string;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'HR' | 'SUPERVISOR' | 'EMPLOYEE';
