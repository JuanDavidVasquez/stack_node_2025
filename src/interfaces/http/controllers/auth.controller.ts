// src/interfaces/http/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import setupLogger from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { AuthService } from '../../../infrastructure/services/auth.service';

export class AuthController {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/controllers`,
  });

  constructor(private readonly authService: AuthService) {
    this.logger.info('AuthController initialized');

    // Binding de métodos para conservar el contexto 'this'
    this.login = this.login.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.logout = this.logout.bind(this);
    this.verifyToken = this.verifyToken.bind(this);
    this.me = this.me.bind(this);
  }

  /**
   * POST /api/v1/auth/login
   * Autentica un usuario
   */
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info('Login request received');
      await this.authService.login(req, res, next);
    } catch (error) {
      this.logger.error('Error in login controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Renueva tokens de acceso
   */
  public async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info('Refresh token request received');
      await this.authService.refreshToken(req, res, next);
    } catch (error) {
      this.logger.error('Error in refresh token controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Cierra sesión del usuario
   */
  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info('Logout request received');
      await this.authService.logout(req, res, next);
    } catch (error) {
      this.logger.error('Error in logout controller:', error);
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/verify
   * Verifica la validez de un token
   */
  public async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info('Verify token request received');
      await this.authService.verifyToken(req, res, next);
    } catch (error) {
      this.logger.error('Error in verify token controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   * Obtiene información del usuario autenticado
   */
  public async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info('Me request received');
      await this.authService.me(req, res, next);
    } catch (error) {
      this.logger.error('Error in me controller:', error);
      next(error);
    }
  }
}