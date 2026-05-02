import { apiGet, apiPost } from "./http";
import type {
  AuthResponse,
  LoginRequest,
  SignupRequest,
  VerifyWelcomeKeyRequest,
  VerifyWelcomeKeyResponse,
  SimpleSuccessResponse,
} from "../types/auth";

export function getMe(): Promise<AuthResponse> {
  return apiGet<AuthResponse>("/auth/me");
}

export function login(req: LoginRequest): Promise<AuthResponse> {
  return apiPost<AuthResponse>("/auth/login", req);
}

export function verifyWelcomeKey(
  req: VerifyWelcomeKeyRequest
): Promise<VerifyWelcomeKeyResponse> {
  return apiPost<VerifyWelcomeKeyResponse>("/auth/welcome/verify", req);
}

export function signup(req: SignupRequest): Promise<AuthResponse> {
  return apiPost<AuthResponse>("/auth/signup", req);
}

export function logout(): Promise<SimpleSuccessResponse> {
  return apiPost<SimpleSuccessResponse>("/auth/logout");
}
