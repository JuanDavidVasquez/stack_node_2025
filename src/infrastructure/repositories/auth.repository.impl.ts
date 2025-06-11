// src/infrastructure/repositories/auth.repository.impl.ts
import { Repository } from 'typeorm';
import { Auth } from '../../domain/entities/auth.entity';
import { User } from '../../domain/entities/user.entity';
import { UserTypeOrmEntity } from '../database/entities/user.typeorm.entity';
import { AuthMapper } from './mappers/auth.mapper';
import { UserMapper } from './mappers/user.mappers';
import { InfrastructureError } from '../../shared/errors/infrastructure.error';
import { DatabaseManager } from '../../database-manager';
import { setupLogger } from '../utils/logger';
import { config } from '../database/config/env';
import { EncryptionAdapter } from '../adaptadores';
import { AuthRepository } from '../../domain/entities/auth.repository';

export class AuthRepositoryImpl implements AuthRepository {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/repositories`,
  });
  
  private ormRepository: Repository<UserTypeOrmEntity>;

  constructor(
    private databaseManager: DatabaseManager,
    private encryptionAdapter: EncryptionAdapter
  ) {
    try {
      const dataSource = databaseManager.getConnection();
      this.ormRepository = dataSource.getRepository(UserTypeOrmEntity);
      this.logger.info('AuthRepository initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AuthRepository:', error);
      throw new InfrastructureError('Failed to initialize AuthRepository');
    }
  }

  /**
   * Verifica la conexión a la base de datos
   */
  private ensureConnection(): void {
    if (!this.databaseManager.isConnected()) {
      throw new InfrastructureError('Database connection lost. Please try again later.');
    }
  }

  /**
   * Autentica un usuario con email y contraseña
   */
  async authenticateUser(email: string, password: string): Promise<Auth | null> {
    try {
      this.ensureConnection();
      this.logger.debug(`Authenticating user: ${email}`);

      // Buscar el usuario por email
      const userEntity = await this.ormRepository.findOne({
        where: { email }
      });

      if (!userEntity) {
        this.logger.debug(`User not found: ${email}`);
        return null;
      }

      // Convertir a Auth para verificar bloqueos
      const auth = AuthMapper.toDomain(userEntity);

      // Verificar si puede intentar login
      if (!auth.canAttemptLogin()) {
        if (!auth.isActive) {
          this.logger.warn(`Inactive user attempted login: ${email}`);
          return null;
        }
        if (auth.isLocked()) {
          this.logger.warn(`Locked user attempted login: ${email}`);
          return null;
        }
      }

      // Verificar contraseña
      const isPasswordValid = await this.encryptionAdapter.compare(password, userEntity.password);
      
      if (!isPasswordValid) {
        this.logger.warn(`Invalid password for user: ${email}`);
        
        // Registrar intento fallido
        auth.recordFailedLoginAttempt();
        await this.updateAuthInfo(auth);
        
        return null;
      }

      // Login exitoso
      auth.recordSuccessfulLogin();
      await this.updateAuthInfo(auth);

      this.logger.info(`User authenticated successfully: ${email}`);
      return auth;

    } catch (error) {
      this.logger.error(`Error authenticating user ${email}:`, error);
      throw new InfrastructureError(`Error authenticating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Busca información de autenticación por email
   */
  async findByEmail(email: string): Promise<Auth | null> {
    try {
      this.ensureConnection();
      this.logger.debug(`Finding auth info for email: ${email}`);

      const userEntity = await this.ormRepository.findOne({
        where: { email }
      });

      return userEntity ? AuthMapper.toDomain(userEntity) : null;
    } catch (error) {
      this.logger.error(`Error finding auth by email ${email}:`, error);
      throw new InfrastructureError(`Error finding auth by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Busca información de autenticación por ID de usuario
   */
  async findByUserId(userId: string): Promise<Auth | null> {
    try {
      this.ensureConnection();
      this.logger.debug(`Finding auth info for user ID: ${userId}`);

      const userEntity = await this.ormRepository.findOne({
        where: { id: userId }
      });

      return userEntity ? AuthMapper.toDomain(userEntity) : null;
    } catch (error) {
      this.logger.error(`Error finding auth by user ID ${userId}:`, error);
      throw new InfrastructureError(`Error finding auth by user ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Actualiza información de autenticación
   */
  async updateAuthInfo(auth: Auth): Promise<Auth> {
    try {
      this.ensureConnection();
      this.logger.debug(`Updating auth info for user: ${auth.userId}`);

      // Buscar la entidad existente
      const userEntity = await this.ormRepository.findOne({
        where: { id: auth.userId }
      });

      if (!userEntity) {
        throw new InfrastructureError(`User not found: ${auth.userId}`);
      }

      // Actualizar campos de autenticación
      AuthMapper.updateTypeOrmEntity(userEntity, auth);

      // Guardar cambios
      const updatedEntity = await this.ormRepository.save(userEntity);
      
      return AuthMapper.toDomain(updatedEntity);
    } catch (error) {
      this.logger.error(`Error updating auth info for user ${auth.userId}:`, error);
      throw new InfrastructureError(`Error updating auth info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Registra un intento de login (para auditoría)
   */
  async recordLoginAttempt(email: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      this.logger.debug(`Recording login attempt for ${email}: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      // Aquí podrías implementar una tabla de auditoría de logins
      // Por ahora solo lo logueamos
      this.logger.info(`Login attempt - Email: ${email}, Success: ${success}, IP: ${ipAddress || 'unknown'}, UserAgent: ${userAgent || 'unknown'}`);
      
    } catch (error) {
      this.logger.error(`Error recording login attempt:`, error);
      // No lanzar error aquí para no interrumpir el flujo de login
    }
  }

  /**
   * Obtiene el usuario completo para autenticación
   */
  async getUserForAuth(email: string): Promise<User | null> {
    try {
      this.ensureConnection();
      this.logger.debug(`Getting user for auth: ${email}`);

      const userEntity = await this.ormRepository.findOne({
        where: { email }
      });

      return userEntity ? UserMapper.toDomain(userEntity) : null;
    } catch (error) {
      this.logger.error(`Error getting user for auth ${email}:`, error);
      throw new InfrastructureError(`Error getting user for auth: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verifica si el usuario existe y está activo
   */
  async isUserActiveAndVerified(email: string): Promise<boolean> {
    try {
      this.ensureConnection();
      
      const userEntity = await this.ormRepository.findOne({
        where: { email },
        select: ['isActive']
      });

      return userEntity ? userEntity.isActive : false;
    } catch (error) {
      this.logger.error(`Error checking if user is active ${email}:`, error);
      return false;
    }
  }

  /**
   * Desbloquea una cuenta manualmente
   */
  async unlockAccount(email: string): Promise<void> {
    try {
      this.ensureConnection();
      this.logger.info(`Unlocking account: ${email}`);

      const auth = await this.findByEmail(email);
      if (!auth) {
        throw new InfrastructureError(`User not found: ${email}`);
      }

      auth.unlock();
      await this.updateAuthInfo(auth);

      this.logger.info(`Account unlocked successfully: ${email}`);
    } catch (error) {
      this.logger.error(`Error unlocking account ${email}:`, error);
      throw new InfrastructureError(`Error unlocking account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene estadísticas de login de un usuario
   */
  async getLoginStats(userId: string, days: number = 30): Promise<{
    totalLogins: number;
    lastLogin: Date | null;
    failedAttempts: number;
    isLocked: boolean;
  }> {
    try {
      this.ensureConnection();
      this.logger.debug(`Getting login stats for user: ${userId}`);

      const auth = await this.findByUserId(userId);
      if (!auth) {
        return {
          totalLogins: 0,
          lastLogin: null,
          failedAttempts: 0,
          isLocked: false
        };
      }

      // Aquí podrías hacer consultas más complejas a una tabla de auditoría
      // Por ahora retornamos información básica
      return {
        totalLogins: auth.lastLoginAt ? 1 : 0, // Simplificado
        lastLogin: auth.lastLoginAt,
        failedAttempts: auth.loginAttempts,
        isLocked: auth.isLocked()
      };
    } catch (error) {
      this.logger.error(`Error getting login stats for user ${userId}:`, error);
      throw new InfrastructureError(`Error getting login stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}