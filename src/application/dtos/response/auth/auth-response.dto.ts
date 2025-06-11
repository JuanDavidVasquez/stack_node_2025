// src/application/dtos/response/auth/auth-response.dto.ts
import { UserRole } from "../../../../shared/constants/roles";

/**
 * DTO base para respuestas de autenticación
 * Nota: Renombrado para evitar conflicto con AuthUserResponseDTO en user-response.dto
 */
export interface AuthenticatedUserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO para respuesta de login exitoso
 */
export interface LoginResponseDTO {
  user: AuthenticatedUserDTO;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  expiresIn: string;
  message: string;
}

/**
 * DTO para respuesta de refresh token
 */
export interface RefreshTokenResponseDTO {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  message: string;
}

/**
 * DTO para respuesta de logout
 */
export interface LogoutResponseDTO {
  message: string;
  loggedOutAt: Date;
}

/**
 * DTO para respuesta de cambio de contraseña
 */
export interface ChangePasswordResponseDTO {
  message: string;
  changedAt: Date;
}

/**
 * DTO para respuesta de forgot password
 */
export interface ForgotPasswordResponseDTO {
  message: string;
  email: string;
  expiresIn: string;
}

/**
 * DTO para respuesta de reset password
 */
export interface ResetPasswordResponseDTO {
  message: string;
  resetAt: Date;
}

/**
 * DTO para respuesta de verificación de token
 */
export interface VerifyTokenResponseDTO {
  valid: boolean;
  user?: AuthenticatedUserDTO;
  message: string;
}

/**
 * DTO para respuesta de estadísticas de login
 */
export interface LoginStatsResponseDTO {
  totalLogins: number;
  lastLogin: Date | null;
  failedAttempts: number;
  isLocked: boolean;
  lockedUntil: Date | null;
}

/**
 * DTO para respuesta de desbloqueo de cuenta
 */
export interface UnlockAccountResponseDTO {
  message: string;
  email: string;
  unlockedAt: Date;
}