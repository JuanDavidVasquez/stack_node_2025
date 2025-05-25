// src/infrastructure/repositories/mappers/email-verification.mapper.ts
import { EmailVerification } from '../../../domain/entities/email-verification.entity';
import { EmailVerificationTypeOrmEntity } from '../../database/entities/email-verification.typeorm.entity';

export class EmailVerificationMapper {
  static toDomain(entity: EmailVerificationTypeOrmEntity): EmailVerification {
    return new EmailVerification({
      id: entity.id,
      email: entity.email,
      verificationCode: entity.verificationCode,
      isUsed: entity.isUsed,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      usedAt: entity.usedAt
    });
  }

  static toPersistence(domain: EmailVerification): EmailVerificationTypeOrmEntity {
    const entity = new EmailVerificationTypeOrmEntity();
    entity.id = domain.id;
    entity.email = domain.email;
    entity.verificationCode = domain.verificationCode;
    entity.isUsed = domain.isUsed;
    entity.expiresAt = domain.expiresAt;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    entity.usedAt = domain.usedAt;
    
    return entity;
  }
}