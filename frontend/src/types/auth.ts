export interface AuthUser {
  id: string;
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  welcomeKey: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyWelcomeKeyRequest {
  welcomeKey: string;
}

export interface VerifyWelcomeKeyResponse {
  valid: boolean;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface SimpleSuccessResponse {
  ok: boolean;
}
