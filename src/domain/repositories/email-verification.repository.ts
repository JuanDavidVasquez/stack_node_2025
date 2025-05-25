// src/domain/repositories/email-verification.repository.ts
import { EmailVerification } from '../entities/email-verification.entity';

export abstract class EmailVerificationRepository {
  /**
   * Guarda un código de verificación
   */
  abstract save(emailVerification: EmailVerification): Promise<EmailVerification>;

  /**
   * Busca un código de verificación por email y código
   */
  abstract findByEmailAndCode(email: string, code: string): Promise<EmailVerification | null>;

  /**
   * Busca el código más reciente válido para un email
   */
  abstract findLatestValidByEmail(email: string): Promise<EmailVerification | null>;

  /**
   * Marca todos los códigos anteriores como usados para un email
   */
  abstract markPreviousAsUsed(email: string): Promise<void>;

  /**
   * Elimina códigos expirados (para limpieza)
   */
  abstract deleteExpired(): Promise<number>;

  /**
   * Actualiza un código de verificación
   */
  abstract update(emailVerification: EmailVerification): Promise<EmailVerification>;
}