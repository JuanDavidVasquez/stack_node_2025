// src/infrastructure/repositories/mappers/auth.mapper.ts
import { Auth } from '../../../domain/entities/auth.entity';
import { User } from '../../../domain/entities/user.entity';
import { UserTypeOrmEntity } from '../../database/entities/user.typeorm.entity';
import { AuthenticatedUserDTO } from '../../../application/dtos/response/auth/auth-response.dto';

export class AuthMapper {
  /**
   * Convierte una entidad User de TypeORM a Auth de dominio
   */
  static toDomain(entity: UserTypeOrmEntity): Auth {
    return new Auth({
      userId: entity.id,
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      role: entity.role,
      isActive: entity.isActive,
      lastLoginAt: entity.lastLoginAt || null,
      loginAttempts: entity.loginAttempts || 0,
      lockedUntil: entity.lockedUntil || null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    });
  }

  /**
   * Convierte una entidad User de dominio a Auth de dominio
   */
  static fromUserDomain(user: User): Auth {
    return Auth.fromUser(user);
  }

  /**
   * Actualiza una entidad TypeORM con información de Auth
   */
  static updateTypeOrmEntity(entity: UserTypeOrmEntity, auth: Auth): UserTypeOrmEntity {
    entity.lastLoginAt = auth.lastLoginAt;
    entity.loginAttempts = auth.loginAttempts;
    entity.lockedUntil = auth.lockedUntil;
    entity.updatedAt = auth.updatedAt;
    
    return entity;
  }

  /**
   * Crea un payload para JWT desde Auth
   */
  static toJwtPayload(auth: Auth): Record<string, any> {
    return {
      sub: auth.userId,
      email: auth.email,
      role: auth.role,
      firstName: auth.firstName,
      lastName: auth.lastName,
      isActive: auth.isActive,
      iat: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Crea un DTO de respuesta desde Auth (sin información sensible)
   */
  static toResponseDTO(auth: Auth, includeTokens?: { accessToken: string; refreshToken: string }): AuthenticatedUserDTO {
    const baseResponse: AuthenticatedUserDTO = {
      id: auth.userId,
      email: auth.email,
      firstName: auth.firstName,
      lastName: auth.lastName,
      role: auth.role,
      isActive: auth.isActive,
      lastLoginAt: auth.lastLoginAt,
      createdAt: auth.createdAt,
      updatedAt: auth.updatedAt
    };

    return baseResponse;
  }
}