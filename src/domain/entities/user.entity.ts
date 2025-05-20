// src/domain/entities/user.entity.ts
import { UserRole } from '../../shared/constants/roles';
import { DomainError } from '../../shared/errors/domain.error';
import { UserProps } from './user-props.interface';

export class User {
  readonly id!: string;
  email!: string;
  password!: string;
  firstName!: string;
  lastName!: string;
  role!: UserRole;
  isActive!: boolean;
  verificationCode!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  
  constructor(props: UserProps) {
    // Inicializar con valores por defecto y luego sobreescribir con las props proporcionadas
    Object.assign(this, {
      id: '',
      role: UserRole.USER,
      isActive: false,
      verificationCode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...props
    });
    
    this.validate();
  }
  
  private validate(): void {
    if (!this.email.includes('@')) {
      throw new DomainError('Invalid email format');
    }
    
    if (this.firstName.trim().length === 0) {
      throw new DomainError('First name cannot be empty');
    }
    
    if (this.lastName.trim().length === 0) {
      throw new DomainError('Last name cannot be empty');
    }
    
    if (this.password.length < 8) {
      throw new DomainError('Password must be at least 8 characters long');
    }
  }
  
  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
  
  public activate(): void {
    this.isActive = true;
    this.verificationCode = null;
    this.updatedAt = new Date();
  }
  
  public deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }
  
  public delete(): void {
    this.deletedAt = new Date();
    this.isActive = false;
    this.updatedAt = new Date();
  }
  
  public changeRole(newRole: UserRole): void {
    this.role = newRole;
    this.updatedAt = new Date();
  }
  
  public updateProfile(firstName: string, lastName: string): void {
    if (firstName.trim().length === 0) {
      throw new DomainError('First name cannot be empty');
    }
    
    if (lastName.trim().length === 0) {
      throw new DomainError('Last name cannot be empty');
    }
    
    this.firstName = firstName;
    this.lastName = lastName;
    this.updatedAt = new Date();
  }
  
  public updateEmail(email: string): void {
    if (!email.includes('@')) {
      throw new DomainError('Invalid email format');
    }
    
    this.email = email;
    this.updatedAt = new Date();
  }
  
  public updatePassword(password: string): void {
    if (password.length < 8) {
      throw new DomainError('Password must be at least 8 characters long');
    }
    
    this.password = password;
    this.updatedAt = new Date();
  }
  
  // Método estático para crear una nueva instancia (patrón Factory)
  public static create(props: UserProps): User {
    return new User(props);
  }
}