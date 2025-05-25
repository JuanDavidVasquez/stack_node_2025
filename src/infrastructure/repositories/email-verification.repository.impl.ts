// src/infrastructure/repositories/email-verification.repository.impl.ts
import { Repository } from 'typeorm';
import { EmailVerification } from '../../domain/entities/email-verification.entity';
import { EmailVerificationRepository } from '../../domain/repositories/email-verification.repository';
import { EmailVerificationTypeOrmEntity } from '../database/entities/email-verification.typeorm.entity';
import { EmailVerificationMapper } from './mappers/email-verification.mapper';
import { InfrastructureError } from '../../shared/errors/infrastructure.error';
import { DatabaseManager } from '../../database-manager';
import { setupLogger } from '../utils/logger';
import { config } from '../database/config/env';

export class EmailVerificationRepositoryImpl implements EmailVerificationRepository {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/repositories`,
  });
  
  private ormRepository: Repository<EmailVerificationTypeOrmEntity>;

  constructor(private databaseManager: DatabaseManager) {
    try {
      const dataSource = databaseManager.getConnection();
      this.ormRepository = dataSource.getRepository(EmailVerificationTypeOrmEntity);
      this.logger.info('EmailVerificationRepository initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize EmailVerificationRepository:', error);
      throw new InfrastructureError('Failed to initialize EmailVerificationRepository');
    }
  }

  async save(emailVerification: EmailVerification): Promise<EmailVerification> {
    try {
      this.logger.debug(`Saving email verification for: ${emailVerification.email}`);
      
      const entity = EmailVerificationMapper.toPersistence(emailVerification);
      const savedEntity = await this.ormRepository.save(entity);
      
      this.logger.debug(`Email verification saved: ${savedEntity.id}`);
      return EmailVerificationMapper.toDomain(savedEntity);
    } catch (error) {
      this.logger.error('Error saving email verification:', error);
      throw new InfrastructureError(`Error saving email verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByEmailAndCode(email: string, code: string): Promise<EmailVerification | null> {
    try {
      this.logger.debug(`Finding verification code for email: ${email}`);
      
      const entity = await this.ormRepository.findOne({
        where: {
          email,
          verificationCode: code.trim().toUpperCase()
        }
      });

      return entity ? EmailVerificationMapper.toDomain(entity) : null;
    } catch (error) {
      this.logger.error('Error finding email verification:', error);
      throw new InfrastructureError(`Error finding email verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findLatestValidByEmail(email: string): Promise<EmailVerification | null> {
    try {
      this.logger.debug(`Finding latest valid verification for: ${email}`);
      
      const entity = await this.ormRepository.findOne({
        where: {
          email,
          isUsed: false
        },
        order: {
          createdAt: 'DESC'
        }
      });

      if (!entity) {
        return null;
      }

      const verification = EmailVerificationMapper.toDomain(entity);
      
      // Verificar si no ha expirado
      if (verification.isExpired()) {
        return null;
      }

      return verification;
    } catch (error) {
      this.logger.error('Error finding latest valid verification:', error);
      throw new InfrastructureError(`Error finding latest valid verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async markPreviousAsUsed(email: string): Promise<void> {
    try {
      this.logger.debug(`Marking previous codes as used for: ${email}`);
      
      await this.ormRepository.update(
        { email, isUsed: false },
        { 
          isUsed: true, 
          usedAt: new Date(),
          updatedAt: new Date()
        }
      );
    } catch (error) {
      this.logger.error('Error marking previous codes as used:', error);
      throw new InfrastructureError(`Error marking previous codes as used: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteExpired(): Promise<number> {
    try {
      this.logger.debug('Deleting expired verification codes');
      
      const result = await this.ormRepository
        .createQueryBuilder()
        .delete()
        .where('expires_at < :now', { now: new Date() })
        .execute();

      const deletedCount = result.affected || 0;
      this.logger.info(`Deleted ${deletedCount} expired verification codes`);
      
      return deletedCount;
    } catch (error) {
      this.logger.error('Error deleting expired codes:', error);
      throw new InfrastructureError(`Error deleting expired codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(emailVerification: EmailVerification): Promise<EmailVerification> {
    try {
      this.logger.debug(`Updating email verification: ${emailVerification.id}`);
      
      const entity = EmailVerificationMapper.toPersistence(emailVerification);
      const updatedEntity = await this.ormRepository.save(entity);
      
      return EmailVerificationMapper.toDomain(updatedEntity);
    } catch (error) {
      this.logger.error('Error updating email verification:', error);
      throw new InfrastructureError(`Error updating email verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}