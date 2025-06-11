// src/infrastructure/repositories/user.repository.impl.ts
import { Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { UserTypeOrmEntity } from '../database/entities/user.typeorm.entity';
import { InfrastructureError } from '../../shared/errors/infrastructure.error';
import { UserRole } from '../../shared/constants/roles';
import { setupLogger } from '../utils/logger';
import { config } from '../database/config/env';
import { PaginatedResult, PaginationOptions, UserRepository } from '../../domain/repositories/user.repository';
import { DatabaseManager } from '../../database-manager';
import { UserMapper } from './mappers/user.mappers';

/**
 * Implementación del repositorio de usuarios que utiliza TypeORM
 * y el DatabaseManager para una gestión robusta de la conexión
 */
export class UserRepositoryImpl implements UserRepository {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/repositories`,
  });
  private ormRepository: Repository<UserTypeOrmEntity>;

  constructor(private databaseManager: DatabaseManager) {
    try {
      // Obtener la conexión TypeORM y el repositorio
      const dataSource = databaseManager.getConnection();
      this.ormRepository = dataSource.getRepository(UserTypeOrmEntity);
      this.logger.info('UserRepository initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize UserRepository:', error);
      throw new InfrastructureError('Failed to initialize UserRepository: Database connection not available');
    }
  }

  /**
   * Verifica si la conexión a la base de datos está activa antes de realizar operaciones
   * @throws InfrastructureError
   */
  private ensureConnection(): void {
    if (!this.databaseManager.isConnected()) {
      throw new InfrastructureError('Database connection lost. Please try again later.');
    }
  }

  /**
   * Busca un usuario por su ID
   * @param id ID del usuario
   * @returns Usuario encontrado o null si no existe
   */
  async findById(id: string): Promise<User | null> {
    try {
      this.ensureConnection();

      this.logger.debug(`Finding user by ID: ${id}`);
      const userEntity = await this.ormRepository.findOne({
        where: { id },
        cache: true // Usar caché para consultas frecuentes
      });

      return userEntity ? UserMapper.toDomain(userEntity) : null;
    } catch (error) {
      // Detectar errores específicos de conexión
      if (error instanceof Error &&
        (error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('PROTOCOL_CONNECTION_LOST'))) {
        this.logger.error(`Database connection error when finding user by ID ${id}:`, error);
        throw new InfrastructureError('Database connection failed. Please try again later.');
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      this.logger.error(`Error finding user by ID ${id}:`, error);
      throw new InfrastructureError(`Error finding user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Busca un usuario por su correo electrónico
   * @param email Correo electrónico
   * @returns Usuario encontrado o null si no existe
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      this.ensureConnection();

      this.logger.debug(`Finding user by email: ${email}`);
      const userEntity = await this.ormRepository.findOne({
        where: { email },
        cache: true
      });
      return userEntity ? UserMapper.toDomain(userEntity) : null;
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      this.logger.error(`Error finding user by email ${email}:`, error);
      throw new InfrastructureError(`Error finding user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Busca un usuario por su código de verificación
   * @param code Código de verificación
   * @returns Usuario encontrado o null si no existe
   */
  async findByVerificationCode(code: string): Promise<User | null> {
    try {
      this.ensureConnection();

      this.logger.debug(`Finding user by verification code: ${code}`);
      const userEntity = await this.ormRepository.findOne({
        where: { verificationCode: code }
      });

      return userEntity ? UserMapper.toDomain(userEntity) : null;
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      this.logger.error(`Error finding user by verification code:`, error);
      throw new InfrastructureError(`Error finding user by verification code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene todos los usuarios con soporte para paginación
   * @param options Opciones de paginación
   * @returns Resultado paginado con usuarios
   */
  async findAll(options?: PaginationOptions): Promise<PaginatedResult<User>> {
    try {
      this.ensureConnection();

      const paginationOptions = {
        page: options?.page || 1,
        limit: options?.limit || 10,
        search: options?.search,
        orderBy: options?.orderBy || 'createdAt',
        orderDirection: options?.orderDirection || 'DESC'
      };

      const paginated = await this.findPaginated({
        ...paginationOptions
      });
      return {
        data: paginated.data,
        total: paginated.total,
        pages: paginated.pages,
        currentPage: paginationOptions.page
      };
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      this.logger.error('Error finding all users with pagination:', error);
      throw new InfrastructureError(`Error finding all users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  /**
   * Guarda un usuario
   * @param user Usuario a guardar
   * @returns Usuario guardado
   */
  async save(user: User): Promise<User> {
    try {
      this.ensureConnection();

      // Usar una transacción para garantizar consistencia
      return await this.databaseManager.executeTransaction(async (queryRunner) => {
        this.logger.debug(`Saving user ${user.id || 'new'}`);
        const repository = queryRunner.manager.getRepository(UserTypeOrmEntity);

        const userEntity = UserMapper.toPersistence(user);
        const savedEntity = await repository.save(userEntity);

        this.logger.debug(`User saved successfully: ${savedEntity.id}`);
        return UserMapper.toDomain(savedEntity);
      });
    } catch (error) {
      this.logger.error(`Error saving user:`, error);

      // Manejar errores específicos
      if (error instanceof Error && error.message.includes('duplicate')) {
        throw new InfrastructureError(`A user with this email already exists`);
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(`Error saving user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Actualiza un usuario existente
   * @param user Usuario a actualizar
   * @returns Usuario actualizado
   */
  async update(user: User): Promise<User> {
    try {
      this.ensureConnection();

      // Verificar si el usuario existe antes de actualizar
      const existingUser = await this.findById(user.id);
      if (!existingUser) {
        this.logger.warn(`Attempted to update non-existent user: ${user.id}`);
        throw new InfrastructureError(`User with ID ${user.id} not found`);
      }

      // Usar una transacción para la actualización
      return await this.databaseManager.executeTransaction(async (queryRunner) => {
        this.logger.debug(`Updating user: ${user.id}`);
        const repository = queryRunner.manager.getRepository(UserTypeOrmEntity);

        const userEntity = UserMapper.toPersistence(user);
        const updatedEntity = await repository.save(userEntity);

        this.logger.debug(`User updated successfully: ${updatedEntity.id}`);
        return UserMapper.toDomain(updatedEntity);
      });
    } catch (error) {
      this.logger.error(`Error updating user ${user.id}:`, error);

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(`Error updating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Elimina un usuario (soft delete)
   * @param id ID del usuario a eliminar
   */
  async delete(id: string): Promise<void> {
    try {
      this.ensureConnection();

      // Verificar si el usuario existe antes de eliminar
      const existingUser = await this.findById(id);
      if (!existingUser) {
        this.logger.warn(`Attempted to delete non-existent user: ${id}`);
        throw new InfrastructureError(`User with ID ${id} not found`);
      }

      // Usar una transacción para la eliminación
      await this.databaseManager.executeTransaction(async (queryRunner) => {
        this.logger.debug(`Soft deleting user: ${id}`);
        const repository = queryRunner.manager.getRepository(UserTypeOrmEntity);

        await repository.softDelete(id);
        this.logger.debug(`User soft deleted successfully: ${id}`);
      });
    } catch (error) {
      this.logger.error(`Error deleting user ${id}:`, error);

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(`Error deleting user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Busca usuarios por rol con soporte para paginación
   * @param role Rol de usuarios a buscar
   * @param options Opciones de paginación
   * @returns Resultado paginado con usuarios
   */
  async findByRole(role: UserRole, options?: PaginationOptions): Promise<PaginatedResult<User>> {
    try {
      this.ensureConnection();

      const paginationOptions = {
        page: options?.page || 1,
        limit: options?.limit || 10,
        search: options?.search,
        orderBy: options?.orderBy || 'createdAt',
        orderDirection: options?.orderDirection || 'DESC'
      };

      const paginated = await this.findPaginated({
        ...paginationOptions,
        role
      });

      // Corregir aquí: usar paginated.data en lugar de paginated.users
      return {
        data: paginated.data,
        total: paginated.total,
        pages: paginated.pages,
        currentPage: paginationOptions.page
      };
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      this.logger.error(`Error finding users by role ${role} with pagination:`, error);
      throw new InfrastructureError(`Error finding users by role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Busca usuarios activos con soporte para paginación
   * @param options Opciones de paginación
   * @returns Resultado paginado con usuarios activos
   */
  async findActive(options?: PaginationOptions): Promise<PaginatedResult<User>> {
    try {
      this.ensureConnection();

      const paginationOptions = {
        page: options?.page || 1,
        limit: options?.limit || 10,
        search: options?.search,
        orderBy: options?.orderBy || 'createdAt',
        orderDirection: options?.orderDirection || 'DESC'
      };

      const paginated = await this.findPaginated({
        ...paginationOptions,
        isActive: true
      });

      // Corregir aquí: usar paginated.data en lugar de paginated.users
      return {
        data: paginated.data,
        total: paginated.total,
        pages: paginated.pages,
        currentPage: paginationOptions.page
      };
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      this.logger.error('Error finding active users with pagination:', error);
      throw new InfrastructureError(`Error finding active users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cuenta el número total de usuarios
   * @returns Número de usuarios
   */
  async count(): Promise<number> {
    try {
      this.ensureConnection();

      this.logger.debug('Counting users');
      return await this.ormRepository.count();
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      this.logger.error('Error counting users:', error);
      throw new InfrastructureError(`Error counting users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
    * Busca usuarios paginados con opciones de filtrado
    * @param options Opciones de paginación y filtrado
    * @returns Objeto con usuarios y metadata de paginación
    */
  async findPaginated(options: {
    page?: number;
    limit?: number;
    role?: UserRole;
    isActive?: boolean;
    search?: string;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<PaginatedResult<User>> {
    try {
      this.ensureConnection();

      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;
      const orderBy = options.orderBy || 'createdAt';
      const orderDirection = options.orderDirection || 'DESC';

      // Construir el query
      const queryBuilder = this.ormRepository.createQueryBuilder('user');

      // Aplicar filtros si existen
      if (options.role !== undefined) {
        queryBuilder.andWhere('user.role = :role', { role: options.role });
      }

      if (options.isActive !== undefined) {
        queryBuilder.andWhere('user.isActive = :isActive', { isActive: options.isActive });
      }

      // Búsqueda por nombre o email
      if (options.search) {
        queryBuilder.andWhere(
          '(user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)',
          { search: `%${options.search}%` }
        );
      }

      // Solo usuarios no eliminados
      queryBuilder.andWhere('user.deletedAt IS NULL');

      // Aplicar ordenamiento
      // Validar que el campo de ordenamiento existe para prevenir SQL injection
      const validOrderFields = ['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt', 'role', 'isActive'];
      const safeOrderBy = validOrderFields.includes(orderBy) ? orderBy : 'createdAt';
      const safeOrderDirection = orderDirection === 'ASC' ? 'ASC' : 'DESC';

      queryBuilder.orderBy(`user.${safeOrderBy}`, safeOrderDirection);

      // Aplicar paginación
      queryBuilder.skip(skip).take(limit);

      // Ejecutar la consulta
      const [entities, total] = await queryBuilder.getManyAndCount();

      const users = entities.map(UserMapper.toDomain);
      const pages = Math.ceil(total / limit);

      return {
        data: users,
        total,
        pages,
        currentPage: page
      };
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      this.logger.error('Error finding paginated users:', error);
      throw new InfrastructureError(`Error finding paginated users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  /**
   * Realiza una eliminación permanente del usuario (solo para tests/admin)
   * @param id ID del usuario a eliminar permanentemente
   */
  async hardDelete(id: string): Promise<void> {
    try {
      this.ensureConnection();

      // Usar una transacción para la eliminación permanente
      await this.databaseManager.executeTransaction(async (queryRunner) => {
        this.logger.warn(`Hard deleting user: ${id}`);
        const repository = queryRunner.manager.getRepository(UserTypeOrmEntity);

        // Verificar existencia
        const exists = await repository.exist({ where: { id } });
        if (!exists) {
          throw new InfrastructureError(`User with ID ${id} not found`);
        }

        // Eliminar permanentemente
        await repository.delete(id);
        this.logger.warn(`User hard deleted successfully: ${id}`);
      });
    } catch (error) {
      this.logger.error(`Error hard deleting user ${id}:`, error);

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(`Error hard deleting user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  /**
   * Restaura un usuario previamente eliminado (recuperación de soft delete)
   * @param id ID del usuario a restaurar
   */
  async restore(id: string): Promise<void> {
    try {
      this.ensureConnection();

      // Verificar si el usuario existe y está eliminado
      const queryRunner = this.databaseManager.getConnection().createQueryRunner();
      await queryRunner.connect();

      try {
        // Buscar el usuario incluyendo los eliminados
        const userEntity = await queryRunner.manager.getRepository(UserTypeOrmEntity)
          .createQueryBuilder('user')
          .withDeleted() // Importante: incluir registros eliminados
          .where('user.id = :id', { id })
          .getOne();

        if (!userEntity) {
          this.logger.warn(`Attempted to restore non-existent user: ${id}`);
          throw new InfrastructureError(`User with ID ${id} not found`);
        }

        if (!userEntity.deletedAt) {
          this.logger.warn(`Attempted to restore a user that is not deleted: ${id}`);
          throw new InfrastructureError(`User with ID ${id} is not deleted`);
        }

        // Restaurar el usuario (quitar marca de eliminado)
        await queryRunner.manager.getRepository(UserTypeOrmEntity)
          .restore(id);

        this.logger.debug(`User restored successfully: ${id}`);
      } finally {
        // Siempre liberar el queryRunner
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error(`Error restoring user ${id}:`, error);

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(`Error restoring user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
 * Busca un usuario por su ID incluyendo los registros eliminados (soft delete)
 * @param id ID del usuario
 * @returns Usuario encontrado o null si no existe
 */
async findByIdIncludingDeleted(id: string): Promise<User | null> {
  try {
    this.ensureConnection();

    this.logger.debug(`Finding user by ID including deleted: ${id}`);
    
    const userEntity = await this.ormRepository
      .createQueryBuilder('user')
      .withDeleted() // Importante: incluir registros eliminados
      .where('user.id = :id', { id })
      .getOne();

    return userEntity ? UserMapper.toDomain(userEntity) : null;
  } catch (error) {
    // Detectar errores específicos de conexión
    if (error instanceof Error &&
      (error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('PROTOCOL_CONNECTION_LOST'))) {
      this.logger.error(`Database connection error when finding user by ID ${id} including deleted:`, error);
      throw new InfrastructureError('Database connection failed. Please try again later.');
    }

    if (error instanceof InfrastructureError) {
      throw error;
    }

    this.logger.error(`Error finding user by ID ${id} including deleted:`, error);
    throw new InfrastructureError(`Error finding user by ID including deleted: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
  /**
   * Actualiza múltiples usuarios en una sola transacción
   * @param users Lista de usuarios a actualizar
   * @returns Lista de usuarios actualizados
   */
  async bulkUpdate(users: User[]): Promise<User[]> {
    try {
      this.ensureConnection();

      if (users.length === 0) {
        return [];
      }

      // Usar una transacción para actualizar todos los usuarios
      return await this.databaseManager.executeTransaction(async (queryRunner) => {
        this.logger.debug(`Bulk updating ${users.length} users`);
        const repository = queryRunner.manager.getRepository(UserTypeOrmEntity);

        const userEntities = users.map(UserMapper.toPersistence);
        const savedEntities = await repository.save(userEntities);

        this.logger.debug(`Bulk update completed successfully for ${savedEntities.length} users`);
        return savedEntities.map(UserMapper.toDomain);
      });
    } catch (error) {
      this.logger.error(`Error in bulk update operation:`, error);

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(`Error updating users in bulk: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}