// src/infrastructure/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import setupLogger from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { UserService } from '../../../infrastructure/services/user.service';


export class UserController {
    private readonly logger = setupLogger({
        ...config.logging,
        dir: `${config.logging.dir}/controllers`,
    });
    private readonly userService: UserService;
    constructor(userService: UserService) {
        this.userService = userService;
        this.logger.info('UserController initialized');

        // Binding de métodos para conservar el contexto 'this'
        this.createUser = this.createUser.bind(this);
        this.getUserById = this.getUserById.bind(this);
        this.getUsers = this.getUsers.bind(this);
        this.updateUser = this.updateUser.bind(this);
        this.deleteUser = this.deleteUser.bind(this);
    }

    /**
     * Crea un nuevo usuario
     */
    public async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Creating user...');
            await this.userService.createUser(req, res, next);
        } catch (error) {
            this.logger.error('Error creating user:', error);
            next(error);
        }
    }

    /**
     * Obtiene un usuario por su ID
     */
    public async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Getting user by ID...');
            await this.userService.getUserById(req, res, next);
        } catch (error) {
            this.logger.error('Error getting user by ID:', error);
            next(error);
        }
    }
    /**
     * Obtiene todos los usuarios
     */
    public async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Getting all users...');
            await this.userService.getUsers(req, res, next);
        } catch (error) {
            this.logger.error('Error getting all users:', error);
            next(error);
        }
    }
    /**
     * Actualiza un usuario por su ID
     */
    public async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Updating user...');
            await this.userService.updateUser(req, res, next);
        } catch (error) {
            this.logger.error('Error updating user:', error);
            next(error);
        }
    }
    /**
 * Elimina un usuario por su ID
 */
    public async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Deleting user...');
            await this.userService.deleteUser(req, res, next);
        } catch (error) {
            this.logger.error('Error deleting user:', error);
            next(error);
        }
    }

}