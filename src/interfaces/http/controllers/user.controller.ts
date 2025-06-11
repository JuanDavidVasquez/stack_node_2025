// src/infrastructure/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import setupLogger from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { UserService } from '../../../infrastructure/services/user.service';
import { SupportedLanguage } from '../../../shared/i18n';


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
        this.restoreUser = this.restoreUser.bind(this);
    }

/**
 * Extrae el idioma preferido del usuario desde la request
 */
  private extractLanguage(req: Request): SupportedLanguage {
        // 1. Prioridad más alta: desde el body de la request
        const bodyLang = req.body?.language as string;
        
        // 2. Desde query parameters
        const queryLang = req.query.lang as string;
        
        // 3. Desde headers personalizados
        const headerLang = req.headers['x-language'] as string;
        
        // 4. Desde accept-language
        const acceptLanguage = req.headers['accept-language'];

        // Validar y retornar en orden de prioridad
        if (bodyLang && ['en', 'es'].includes(bodyLang)) {
            this.logger.debug(`Language extracted from body: ${bodyLang}`);
            return bodyLang as SupportedLanguage;
        }

        if (queryLang && ['en', 'es'].includes(queryLang)) {
            this.logger.debug(`Language extracted from query: ${queryLang}`);
            return queryLang as SupportedLanguage;
        }

        if (headerLang && ['en', 'es'].includes(headerLang)) {
            this.logger.debug(`Language extracted from header: ${headerLang}`);
            return headerLang as SupportedLanguage;
        }

        if (acceptLanguage?.includes('en')) {
            this.logger.debug('Language extracted from accept-language: en');
            return 'en';
        }

        this.logger.debug('Using default language: es');
        return 'es'; // default
    }

    /**
     * Crea un nuevo usuario
     */
    public async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Creating user...');

            // Extraer idioma preferido
            const preferredLanguage = this.extractLanguage(req);
console.log(`Preferred language for user creation: ${preferredLanguage}`);
            // Pasar el idioma al service
            await this.userService.createUser(req, res, next, preferredLanguage);
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
    /**
    * Restores a user by ID
    */
    public async restoreUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Restoring user...');
            await this.userService.restoreUser(req, res, next);
        } catch (error) {
            this.logger.error('Error restoring user:', error);
            next(error);
        }
    }

}