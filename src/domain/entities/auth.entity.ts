// src/domain/entities/auth.entity.ts
import { UserRole } from '../../shared/constants/roles';
import { DomainError } from '../../shared/errors/domain.error';

export interface AuthProps {
  id?: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date | null;
  loginAttempts?: number;
  lockedUntil?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Entidad de dominio para la autenticación
 */
export class Auth {
  readonly id!: string;
  userId!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  role!: UserRole;
  isActive!: boolean;
  lastLoginAt!: Date | null;
  loginAttempts!: number;
  lockedUntil!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: AuthProps) {
    Object.assign(this, {
      id: props.id || '',
      loginAttempts: 0,
      lastLoginAt: null,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...props
    });

    this.validate();
  }

  private validate(): void {
    if (!this.email || !this.email.includes('@')) {
      throw new DomainError('Invalid email format');
    }

    if (!this.userId) {
      throw new DomainError('User ID is required');
    }

    if (this.firstName.trim().length === 0) {
      throw new DomainError('First name cannot be empty');
    }

    if (this.lastName.trim().length === 0) {
      throw new DomainError('Last name cannot be empty');
    }
  }

  /**
   * Obtiene el nombre completo del usuario
   */
  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Verifica si la cuenta está bloqueada
   */
  public isLocked(): boolean {
    return this.lockedUntil !== null && this.lockedUntil > new Date();
  }

  /**
   * Verifica si la cuenta puede intentar login
   */
  public canAttemptLogin(): boolean {
    return this.isActive && !this.isLocked();
  }

  /**
   * Registra un intento de login fallido
   */
  public recordFailedLoginAttempt(maxAttempts: number = 5, lockDurationMinutes: number = 15): void {
    this.loginAttempts += 1;
    this.updatedAt = new Date();

    // Si excede el máximo de intentos, bloquear la cuenta
    if (this.loginAttempts >= maxAttempts) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + lockDurationMinutes);
      this.lockedUntil = lockUntil;
    }
  }

  /**
   * Registra un login exitoso
   */
  public recordSuccessfulLogin(): void {
    this.lastLoginAt = new Date();
    this.loginAttempts = 0; // Resetear intentos fallidos
    this.lockedUntil = null; // Desbloquear si estaba bloqueado
    this.updatedAt = new Date();
  }

  /**
   * Desbloquea manualmente la cuenta
   */
  public unlock(): void {
    this.loginAttempts = 0;
    this.lockedUntil = null;
    this.updatedAt = new Date();
  }

  /**
   * Obtiene el tiempo restante de bloqueo en minutos
   */
  public getMinutesUntilUnlock(): number {
    if (!this.isLocked()) {
      return 0;
    }

    const now = new Date();
    const diffMs = this.lockedUntil!.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60)));
  }

  /**
   * Método estático para crear una instancia desde un User
   */
  public static fromUser(user: any): Auth {
    return new Auth({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt || null,
      loginAttempts: user.loginAttempts || 0,
      lockedUntil: user.lockedUntil || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  }
}