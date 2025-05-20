// src/domain/repositories/user.repository.ts
import { User } from '../entities/user.entity';
import { UserRole } from '../../shared/constants/roles';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  pages: number;
  currentPage: number;
}

export abstract class UserRepository {
  // Métodos para buscar un usuario específico (no necesitan paginación)
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByVerificationCode(code: string): Promise<User | null>;
  
  // Métodos que pueden devolver múltiples usuarios (con soporte de paginación)
  abstract findAll(options?: PaginationOptions): Promise<PaginatedResult<User>>;
  abstract findByRole(role: UserRole, options?: PaginationOptions): Promise<PaginatedResult<User>>;
  abstract findActive(options?: PaginationOptions): Promise<PaginatedResult<User>>;
  
  // Método explícito de paginación con opciones más avanzadas
  abstract findPaginated(options: {
    page?: number;
    limit?: number;
    role?: UserRole;
    isActive?: boolean;
    search?: string;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<PaginatedResult<User>>;
  
  // Operaciones CRUD
  abstract save(user: User): Promise<User>;
  abstract update(user: User): Promise<User>;
  abstract delete(id: string): Promise<void>;
  abstract restore(id: string): Promise<void>;
  abstract hardDelete(id: string): Promise<void>;
  abstract bulkUpdate(users: User[]): Promise<User[]>;
  
  // Métodos de conteo
  abstract count(): Promise<number>;
}