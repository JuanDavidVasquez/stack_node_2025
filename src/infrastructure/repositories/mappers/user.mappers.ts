// src/infrastructure/repositories/mappers/user.mapper.ts
import { User } from '../../../domain/entities/user.entity';
import { UserTypeOrmEntity } from '../../database/entities/user.typeorm.entity';

export class UserMapper {
  static toDomain(entity: UserTypeOrmEntity): User {
    return new User({
      id: entity.id,
      email: entity.email,
      password: entity.password,
      firstName: entity.firstName,
      lastName: entity.lastName,
      role: entity.role,
      isActive: entity.isActive,
      verificationCode: entity.verificationCode,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt
    });
  }

  static toPersistence(domain: User): UserTypeOrmEntity {
    const entity = new UserTypeOrmEntity();
    entity.id = domain.id;
    entity.email = domain.email;
    entity.password = domain.password;
    entity.firstName = domain.firstName;
    entity.lastName = domain.lastName;
    entity.role = domain.role;
    entity.isActive = domain.isActive;
    entity.verificationCode = domain.verificationCode;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    entity.deletedAt = domain.deletedAt;
    
    return entity;
  }
}