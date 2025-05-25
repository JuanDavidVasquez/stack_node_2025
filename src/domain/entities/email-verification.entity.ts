// src/domain/entities/email-verification.entity.ts
import { DomainError } from '../../shared/errors/domain.error';

export interface EmailVerificationProps {
  id?: string;
  email: string;
  verificationCode: string;
  isUsed?: boolean;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  usedAt?: Date | null;
}

/**
 * Entidad de dominio para la verificación de email
 */
export class EmailVerification {
  readonly id!: string;
  email!: string;
  verificationCode!: string;
  isUsed!: boolean;
  expiresAt!: Date;
  createdAt!: Date;
  updatedAt!: Date;
  usedAt!: Date | null;

  constructor(props: EmailVerificationProps) {
    Object.assign(this, {
      isUsed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usedAt: null,
      ...props
    });

    this.validate();
  }

  private validate(): void {
    if (!this.email || !this.email.includes('@')) {
      throw new DomainError('Invalid email format');
    }

    if (!this.verificationCode || this.verificationCode.length !== 6) {
      throw new DomainError('Verification code must be 6 characters long');
    }

    if (!this.expiresAt || this.expiresAt <= new Date()) {
      throw new DomainError('Expiration date must be in the future');
    }
  }

  /**
   * Verifica si el código ha expirado
   */
  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Verifica si el código puede ser usado
   */
  public canBeUsed(): boolean {
    return !this.isUsed && !this.isExpired();
  }

  /**
   * Marca el código como usado
   */
  public markAsUsed(): void {
    if (this.isUsed) {
      throw new DomainError('Verification code has already been used');
    }

    if (this.isExpired()) {
      throw new DomainError('Verification code has expired');
    }

    this.isUsed = true;
    this.usedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Obtiene el tiempo restante antes de la expiración en minutos
   */
  public getMinutesUntilExpiration(): number {
    const now = new Date();
    const diffMs = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  }

  /**
   * Verifica si el código proporcionado coincide
   */
  public verifyCode(code: string): boolean {
    return this.verificationCode === code.trim().toUpperCase();
  }

  /**
   * Método estático para crear una nueva instancia con expiración por defecto
   */
  public static create(props: Omit<EmailVerificationProps, 'expiresAt'> & { expirationMinutes?: number }): EmailVerification {
    const expirationMinutes = props.expirationMinutes || 15; // 15 minutos por defecto
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

    return new EmailVerification({
      ...props,
      expiresAt
    });
  }
}