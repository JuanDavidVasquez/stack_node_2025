// src/domain/repositories/auth.repository.ts
import { Auth } from '../entities/auth.entity';
import { User } from '../entities/user.entity';

export abstract class AuthRepository {
  /**
   * Autentica un usuario con email y contraseña
   */
  abstract authenticateUser(email: string, password: string): Promise<Auth | null>;

  /**
   * Busca información de autenticación por email
   */
  abstract findByEmail(email: string): Promise<Auth | null>;

  /**
   * Busca información de autenticación por ID de usuario
   */
  abstract findByUserId(userId: string): Promise<Auth | null>;

  /**
   * Actualiza información de autenticación
   */
  abstract updateAuthInfo(auth: Auth): Promise<Auth>;

  /**
   * Registra un intento de login
   */
  abstract recordLoginAttempt(email: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void>;

  /**
   * Obtiene el usuario completo para autenticación
   */
  abstract getUserForAuth(email: string): Promise<User | null>;

  /**
   * Verifica si el usuario existe y está activo
   */
  abstract isUserActiveAndVerified(email: string): Promise<boolean>;

  /**
   * Desbloquea una cuenta manualmente (admin)
   */
  abstract unlockAccount(email: string): Promise<void>;

  /**
   * Obtiene estadísticas de login de un usuario
   */
  abstract getLoginStats(userId: string, days?: number): Promise<{
    totalLogins: number;
    lastLogin: Date | null;
    failedAttempts: number;
    isLocked: boolean;
  }>;
}