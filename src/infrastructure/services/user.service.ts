// src/infrastructure/services/user.service.ts
import { Request, Response, NextFunction } from 'express';
import setupLogger from '../utils/logger';

// Extiende la interfaz Request para incluir 'user'
declare global {
    namespace Express {
        interface User {
            id: string;
            email: string;
            role: string;
            verifiedAt?: Date | null;
        }
        interface Request {
            user?: User;
        }
    }
}
import { config } from '../database/config/env';
import { UserRepositoryImpl } from '../repositories/user.repository.impl';
import { CreateUserUseCase } from '../../application/use-case/user/create-user.use-case';
import { GetUserUseCase } from '../../application/use-case/user/get-user.use-case';
import { GetUsersUseCase } from '../../application/use-case/user/get-users.use-case';
import { DatabaseManager } from '../../database-manager';
import { EncryptionAdapter, JwtAdapter, UuidAdapter } from '../adaptadores';
import { CreateUserRequestDTO, GetUserRequestDTO, GetUsersRequestDTO } from '../../application/dtos';
import { ApplicationError } from '../../shared/errors/application.error';
import { DomainError } from '../../shared/errors/domain.error';
import { InfrastructureError } from '../../shared/errors/infrastructure.error';
import { UserRole } from '../../shared/constants/roles';
import { User } from '../../domain/entities/user.entity';
import { EmailService } from './email.service';
import { setLanguage, SupportedLanguage, t } from '../../shared/i18n';

export class UserService {
    private readonly logger = setupLogger({
        ...config.logging,
        dir: `${config.logging.dir}/services/user`,
    });

    private readonly userRepository: UserRepositoryImpl;
    private readonly createUserUseCase: CreateUserUseCase;
    private readonly getUserUseCase: GetUserUseCase;
    private readonly getUsersUseCase: GetUsersUseCase;

    constructor(
        private readonly databaseManager: DatabaseManager,
        private readonly encryptionAdapter: EncryptionAdapter,
        private readonly uuidAdapter: UuidAdapter,
        private readonly jwtAdapter: JwtAdapter,
         private readonly emailService: EmailService 
    ) {
        // Inicializar repositorio
        this.userRepository = new UserRepositoryImpl(databaseManager);

        // Inicializar casos de uso
        this.createUserUseCase = new CreateUserUseCase(
            this.userRepository,
            this.encryptionAdapter,
            this.uuidAdapter,
            this.emailService
        );

        this.getUserUseCase = new GetUserUseCase(
            this.userRepository,
            this.uuidAdapter
        );

        this.getUsersUseCase = new GetUsersUseCase(
            this.userRepository
        );

        this.logger.info('UserService initialized');
    }

    /**
     * Crea un nuevo usuario
     */
  public async createUser(req: Request, res: Response, next: NextFunction, language: SupportedLanguage = 'es'): Promise<void> {
  try {
    this.logger.debug('Request to create user:', req.body);
    
    // ESTABLECER IDIOMA GLOBALMENTE
    setLanguage(language);
    
    const createUserDTO: CreateUserRequestDTO = {
      email: req.body.email,
      password: req.body.password,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      role: req.body.role,
      language: req.body.language || language 
    };

    // PASAR EL IDIOMA AL CASO DE USO
    const user = await this.createUserUseCase.execute(createUserDTO, language);

    // Generar token JWT para el usuario creado
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    const tokens = await this.jwtAdapter.generateTokenPair(payload);

    // Responder al cliente
    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        tokens
      }
    });
  } catch (error) {
    this.logger.error('Error in createUser service:', error);

    if (error instanceof ApplicationError ||
        error instanceof DomainError ||
        error instanceof InfrastructureError) {

      res.status(400).json({
        status: 'error',
        message: t('errors.userCreationFailed', {}, language) // Usar el idioma correcto
      });
      return;
    }

    next(error);
  }
}

    /**
     * Obtiene un listado paginado de usuarios con filtros opcionales
     */
    public async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.debug('Request to get users list with filters:', req.query);

            // Extraer y validar parámetros de consulta
            const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

            // Validar role si se proporciona
            let role: UserRole | undefined = undefined;
            if (req.query.role) {
                const roleValue = req.query.role as string;
                if (Object.values(UserRole).includes(roleValue as UserRole)) {
                    role = roleValue as UserRole;
                } else {
                    throw new ApplicationError(`Invalid role: ${roleValue}`);
                }
            }

            // Validar isActive si se proporciona
            let isActive: boolean | undefined = undefined;
            if (req.query.isActive !== undefined) {
                isActive = req.query.isActive === 'true';
            }

            // Preparar el DTO de solicitud
            const getUsersDTO: GetUsersRequestDTO = {
                page,
                limit,
                search: req.query.search as string | undefined,
                role,
                isActive,
                orderBy: (req.query.orderBy as string) ?? 'id',
                orderDirection: ((req.query.orderDirection as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC'
            };

            // Ejecutar el caso de uso
            const users = await this.getUsersUseCase.execute(getUsersDTO);

            // Responder al cliente
            res.status(200).json({
                status: 'success',
                data: users
            });
        } catch (error) {
            this.logger.error('Error in getUsers service:', error);

            if (error instanceof ApplicationError) {
                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            if (error instanceof DomainError ||
                error instanceof InfrastructureError) {

                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Obtiene un usuario por su ID
     */
    public async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.debug(`Request to get user by ID: ${req.params.id}`);

            // Preparar el DTO de solicitud
            const getUserDTO: GetUserRequestDTO = {
                id: req.params.id
            };

            // Ejecutar el caso de uso
            const user = await this.getUserUseCase.execute(getUserDTO);

            // Responder al cliente
            res.status(200).json({
                status: 'success',
                data: {
                    user
                }
            });
        } catch (error) {
            this.logger.error('Error in getUserById service:', error);

            if (error instanceof ApplicationError) {
                // Para errores de aplicación como "usuario no encontrado", usar 404
                if (error.message.includes('not found')) {
                    res.status(404).json({
                        status: 'error',
                        message: error.message
                    });
                    return;
                }

                // Para otros errores de aplicación, usar 400
                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            if (error instanceof DomainError ||
                error instanceof InfrastructureError) {

                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Actualiza un usuario existente
     */
    public async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.debug(`Request to update user ID ${req.params.id}:`, req.body);

            // Verificar que el ID existe en la ruta
            if (!req.params.id) {
                throw new ApplicationError('User ID is required');
            }

            // Obtener el usuario existente primero
            const existingUser = await this.userRepository.findById(req.params.id);
            if (!existingUser) {
                throw new ApplicationError(`User with ID ${req.params.id} not found`);
            }

            // Actualizar los campos del usuario existente usando los métodos/setters del dominio
            if (req.body.email) existingUser.email = req.body.email;
            if (req.body.firstName) existingUser.firstName = req.body.firstName;
            if (req.body.lastName) existingUser.lastName = req.body.lastName;
            if (req.body.role) existingUser.role = req.body.role;
            if (req.body.isActive !== undefined) existingUser.isActive = req.body.isActive;
            if (req.body.password) {
                existingUser.password = await this.encryptionAdapter.hash(req.body.password);
            }

            // Actualizar el usuario en el repositorio
            const updatedUser = await this.userRepository.update(existingUser);

            // Responder al cliente
            res.status(200).json({
                status: 'success',
                message: 'User updated successfully',
                data: {
                    user: {
                        id: updatedUser.id,
                        email: updatedUser.email,
                        firstName: updatedUser.firstName,
                        lastName: updatedUser.lastName,
                        role: updatedUser.role,
                        isActive: updatedUser.isActive,
                        createdAt: updatedUser.createdAt,
                        updatedAt: updatedUser.updatedAt
                    }
                }
            });
        } catch (error) {
            this.logger.error('Error in updateUser service:', error);

            if (error instanceof ApplicationError ||
                error instanceof DomainError ||
                error instanceof InfrastructureError) {

                const statusCode = error.message.includes('not found') ? 404 : 400;
                res.status(statusCode).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Elimina un usuario (soft delete)
     */
    public async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.debug(`Request to delete user ID: ${req.params.id}`);

            // Verificar que el ID existe en la ruta
            if (!req.params.id) {
                throw new ApplicationError('User ID is required');
            }

            // Verificar que el usuario existe antes de eliminarlo
            const existingUser = await this.userRepository.findById(req.params.id);
            if (!existingUser) {
                throw new ApplicationError(`User with ID ${req.params.id} not found`);
            }

            // Realizar soft delete
            await this.userRepository.delete(req.params.id);

            // Responder al cliente
            res.status(200).json({
                status: 'success',
                message: 'User deleted successfully'
            });
        } catch (error) {
            this.logger.error('Error in deleteUser service:', error);

            if (error instanceof ApplicationError ||
                error instanceof DomainError ||
                error instanceof InfrastructureError) {

                const statusCode = error.message.includes('not found') ? 404 : 400;
                res.status(statusCode).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }

/**
 * Restaura un usuario previamente eliminado (soft delete)
 */
public async restoreUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        this.logger.debug(`Request to restore user ID: ${req.params.id}`);

        // Verificar que el ID existe en la ruta
        if (!req.params.id) {
            throw new ApplicationError('User ID is required');
        }

        // Verificar que el usuario existe (incluyendo eliminados) antes de restaurar
        const existingUser = await this.userRepository.findByIdIncludingDeleted(req.params.id);
        if (!existingUser) {
            throw new ApplicationError(`User with ID ${req.params.id} not found`);
        }

        // Verificar que el usuario esté realmente eliminado
        if (!existingUser.deletedAt) {
            throw new ApplicationError(`User with ID ${req.params.id} is not deleted and cannot be restored`);
        }

        // Intentar restaurar el usuario
        await this.userRepository.restore(req.params.id);

        // Obtener el usuario restaurado (ahora usando findById normal ya que fue restaurado)
        const restoredUser = await this.userRepository.findById(req.params.id);
        if (!restoredUser) {
            throw new InfrastructureError('User was not properly restored');
        }

        // Responder al cliente
        res.status(200).json({
            status: 'success',
            message: 'User restored successfully',
            data: {
                user: {
                    id: restoredUser.id,
                    email: restoredUser.email,
                    firstName: restoredUser.firstName,
                    lastName: restoredUser.lastName,
                    role: restoredUser.role,
                    isActive: restoredUser.isActive,
                    createdAt: restoredUser.createdAt,
                    updatedAt: restoredUser.updatedAt
                }
            }
        });
    } catch (error) {
        this.logger.error('Error in restoreUser service:', error);

        if (error instanceof ApplicationError ||
            error instanceof DomainError ||
            error instanceof InfrastructureError) {

            const statusCode = error.message.includes('not found') ? 404 : 400;
            res.status(statusCode).json({
                status: 'error',
                message: error.message
            });
            return;
        }

        next(error);
    }
}

    /**
     * Realiza una eliminación permanente del usuario (solo para admin)
     */
    public async hardDeleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.debug(`Request to hard delete user ID: ${req.params.id}`);

            // Verificar que el ID existe en la ruta
            if (!req.params.id) {
                throw new ApplicationError('User ID is required');
            }

            // Verificar que el usuario solicitante tiene permisos de administrador
            if (req.user?.role !== UserRole.ADMIN) {
                throw new ApplicationError('Only administrators can perform hard delete operations');
            }

            // Realizar hard delete
            await this.userRepository.hardDelete(req.params.id);

            // Responder al cliente
            res.status(200).json({
                status: 'success',
                message: 'User permanently deleted successfully'
            });
        } catch (error) {
            this.logger.error('Error in hardDeleteUser service:', error);

            if (error instanceof ApplicationError ||
                error instanceof DomainError ||
                error instanceof InfrastructureError) {

                const statusCode = error.message.includes('not found') ? 404 : 400;
                res.status(statusCode).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Busca usuarios por su rol
     */
    public async getUsersByRole(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.debug(`Request to get users by role: ${req.params.role}`);

            // Verificar que el rol existe en la ruta
            if (!req.params.role) {
                throw new ApplicationError('Role is required');
            }

            // Validar que el rol es válido
            const role = req.params.role as string;
            if (!Object.values(UserRole).includes(role as UserRole)) {
                throw new ApplicationError(`Invalid role: ${role}`);
            }

            // Extraer y validar parámetros de consulta para paginación
            const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

            // Buscar usuarios por rol
            const users = await this.userRepository.findByRole(role as UserRole, {
                page,
                limit,
                search: req.query.search as string | undefined,
                orderBy: req.query.orderBy as string | undefined,
                orderDirection: (req.query.orderDirection as 'ASC' | 'DESC' | undefined)
            });

            // Responder al cliente
            res.status(200).json({
                status: 'success',
                data: users
            });
        } catch (error) {
            this.logger.error('Error in getUsersByRole service:', error);

            if (error instanceof ApplicationError ||
                error instanceof DomainError ||
                error instanceof InfrastructureError) {

                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Busca usuarios activos
     */
    public async getActiveUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.debug('Request to get active users');

            // Extraer y validar parámetros de consulta para paginación
            const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

            // Buscar usuarios activos
            const users = await this.userRepository.findActive({
                page,
                limit,
                search: req.query.search as string | undefined,
                orderBy: req.query.orderBy as string | undefined,
                orderDirection: (req.query.orderDirection as 'ASC' | 'DESC' | undefined)
            });

            // Responder al cliente
            res.status(200).json({
                status: 'success',
                data: users
            });
        } catch (error) {
            this.logger.error('Error in getActiveUsers service:', error);

            if (error instanceof ApplicationError ||
                error instanceof DomainError ||
                error instanceof InfrastructureError) {

                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Busca un usuario por su correo electrónico
     */
    public async getUserByEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.debug(`Request to get user by email: ${req.params.email}`);

            // Verificar que el correo existe en la ruta
            if (!req.params.email) {
                throw new ApplicationError('Email is required');
            }

            // Buscar usuario por correo
            const user = await this.userRepository.findByEmail(req.params.email);
            if (!user) {
                throw new ApplicationError(`User with email ${req.params.email} not found`);
            }

            // Responder al cliente
            res.status(200).json({
                status: 'success',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        isActive: user.isActive,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt
                    }
                }
            });
        } catch (error) {
            this.logger.error('Error in getUserByEmail service:', error);

            if (error instanceof ApplicationError) {
                const statusCode = error.message.includes('not found') ? 404 : 400;
                res.status(statusCode).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            if (error instanceof DomainError ||
                error instanceof InfrastructureError) {

                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Verifica un usuario usando su código de verificación
     */
    public async verifyUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.debug(`Request to verify user with code: ${req.params.code}`);

            // Verificar que el código existe en la ruta
            if (!req.params.code) {
                throw new ApplicationError('Verification code is required');
            }

            // Buscar usuario por código de verificación
            const user = await this.userRepository.findByVerificationCode(req.params.code);
            if (!user) {
                throw new ApplicationError('Invalid verification code');
            }

            // Actualizar usuario como verificado
            user.isActive = true;
            user.verificationCode = null;
            
            // Guardar cambios
            const updatedUser = await this.userRepository.update(user);

            // Responder al cliente
            res.status(200).json({
                status: 'success',
                message: 'User verified successfully',
                data: {
                    user: {
                        id: updatedUser.id,
                        email: updatedUser.email,
                        firstName: updatedUser.firstName,
                        lastName: updatedUser.lastName,
                        isActive: updatedUser.isActive
                    }
                }
            });
        } catch (error) {
            this.logger.error('Error in verifyUser service:', error);

            if (error instanceof ApplicationError ||
                error instanceof DomainError ||
                error instanceof InfrastructureError) {

                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Actualiza múltiples usuarios en una sola operación
     */
    public async bulkUpdateUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.debug('Request to bulk update users:', req.body);

            // Verificar que se proporcionaron usuarios
            if (!req.body.users || !Array.isArray(req.body.users) || req.body.users.length === 0) {
                throw new ApplicationError('A valid array of users is required');
            }

            // Verificar que el usuario solicitante tiene permisos de administrador
            if (req.user?.role !== UserRole.ADMIN) {
                throw new ApplicationError('Only administrators can perform bulk update operations');
            }

            // Array para almacenar usuarios a actualizar
            const usersToUpdate: User[] = [];

            // Procesar cada usuario
            for (const userData of req.body.users) {
                // Verificar ID
                if (!userData.id) {
                    throw new ApplicationError('Each user must have an ID');
                }

                // Obtener el usuario existente
                const existingUser = await this.userRepository.findById(userData.id);
                if (!existingUser) {
                    throw new ApplicationError(`User with ID ${userData.id} not found`);
                }

                // Actualizar propiedades del usuario existente
                if (userData.email) existingUser.email = userData.email;
                if (userData.firstName) existingUser.firstName = userData.firstName;
                if (userData.lastName) existingUser.lastName = userData.lastName;
                if (userData.role) existingUser.role = userData.role;
                if (userData.isActive !== undefined) existingUser.isActive = userData.isActive;

                // Agregar a la lista
                usersToUpdate.push(existingUser);
            }

            // Realizar actualización masiva
            const updatedUsers = await this.userRepository.bulkUpdate(usersToUpdate);

            // Responder al cliente
            res.status(200).json({
                status: 'success',
                message: `${updatedUsers.length} users updated successfully`,
                data: {
                    users: updatedUsers.map(user => ({
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        isActive: user.isActive,
                        updatedAt: user.updatedAt
                    }))
                }
            });
        } catch (error) {
            this.logger.error('Error in bulkUpdateUsers service:', error);

            if (error instanceof ApplicationError ||
                error instanceof DomainError ||
                error instanceof InfrastructureError) {

                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }

    /**
     * Obtiene el conteo total de usuarios
     */
    public async getUserCount(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.debug('Request to get user count');

            // Obtener conteo de usuarios
            const count = await this.userRepository.count();

            // Responder al cliente
            res.status(200).json({
                status: 'success',
                data: {
                    count
                }
            });
        } catch (error) {
            this.logger.error('Error in getUserCount service:', error);

            if (error instanceof ApplicationError ||
                error instanceof DomainError ||
                error instanceof InfrastructureError) {

                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }

            next(error);
        }
    }
}