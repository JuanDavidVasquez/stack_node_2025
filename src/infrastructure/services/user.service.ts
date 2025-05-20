// src/infrastructure/services/user.service.ts
import { Request, Response, NextFunction } from 'express';
import setupLogger from '../utils/logger';
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
        private readonly jwtAdapter: JwtAdapter
    ) {
        // Inicializar repositorio
        this.userRepository = new UserRepositoryImpl(databaseManager);

        // Inicializar casos de uso
        this.createUserUseCase = new CreateUserUseCase(
            this.userRepository,
            this.encryptionAdapter,
            this.uuidAdapter
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
    public async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.debug('Request to create user:', req.body);

            // Mapear los datos de la solicitud HTTP al DTO de aplicación
            const createUserDTO: CreateUserRequestDTO = {
                email: req.body.email,
                password: req.body.password,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                role: req.body.role
            };

            // Ejecutar el caso de uso
            const user = await this.createUserUseCase.execute(createUserDTO);

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
                    message: error.message
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
            const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

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
                orderBy: req.query.orderBy as string | undefined,
                orderDirection: (req.query.orderDirection as 'ASC' | 'DESC' | undefined)
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
}