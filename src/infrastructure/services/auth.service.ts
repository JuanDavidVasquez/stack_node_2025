// src/infrastructure/services/auth.service.ts
import { Request, Response, NextFunction } from 'express';
import setupLogger from '../utils/logger';
import { config } from '../database/config/env';
import { AuthRepositoryImpl } from '../repositories/auth.repository.impl';

import { DatabaseManager } from '../../database-manager';
import { EncryptionAdapter, JwtAdapter } from '../adaptadores';
import { ApplicationError } from '../../shared/errors/application.error';
import { DomainError } from '../../shared/errors/domain.error';
import { InfrastructureError } from '../../shared/errors/infrastructure.error';
import { LoginUseCase } from '../../application/use-case/auth/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-case/auth/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-case/auth/logout.use-case';
import { VerifyTokenUseCase } from '../../application/use-case/auth/verify-token.use-case';

export class AuthService {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/services/auth`,
  });

  private readonly authRepository: AuthRepositoryImpl;
  private readonly loginUseCase: LoginUseCase;
  private readonly refreshTokenUseCase: RefreshTokenUseCase;
  private readonly logoutUseCase: LogoutUseCase;
  private readonly verifyTokenUseCase: VerifyTokenUseCase;

  constructor(
    private readonly databaseManager: DatabaseManager,
    private readonly encryptionAdapter: EncryptionAdapter,
    private readonly jwtAdapter: JwtAdapter
  ) {
    // Inicializar repositorio
    this.authRepository = new AuthRepositoryImpl(databaseManager, encryptionAdapter);

    // Inicializar casos de uso
    this.loginUseCase = new LoginUseCase(this.authRepository, this.jwtAdapter);
    this.refreshTokenUseCase = new RefreshTokenUseCase(this.authRepository, this.jwtAdapter);
    this.logoutUseCase = new LogoutUseCase(this.jwtAdapter);
    this.verifyTokenUseCase = new VerifyTokenUseCase(this.authRepository, this.jwtAdapter);

    this.logger.info('AuthService initialized');
  }

  /**
   * Maneja el login de usuarios
   */
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.debug('Login request received');

      // Obtener información adicional del request
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Ejecutar caso de uso
      const result = await this.loginUseCase.execute(req.body, ipAddress, userAgent);

      // Configurar cookies seguras para los tokens (opcional)
      if (config.app.env === 'production') {
        res.cookie('refreshToken', result.tokens.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });
      }

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: {
          user: result.user,
          tokens: result.tokens,
          expiresIn: result.expiresIn
        }
      });
    } catch (error) {
      this.logger.error('Error in login service:', error);
      this.handleAuthError(error, res, next);
    }
  }

  /**
   * Maneja el refresh de tokens
   */
  public async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.debug('Refresh token request received');

      // El refresh token puede venir del body o de las cookies
      const refreshTokenFromBody = req.body.refreshToken;
      const refreshTokenFromCookie = req.cookies?.refreshToken;
      
      const refreshTokenData = {
        refreshToken: refreshTokenFromBody || refreshTokenFromCookie
      };

      if (!refreshTokenData.refreshToken) {
        throw new ApplicationError('Refresh token is required');
      }

      // Ejecutar caso de uso
      const result = await this.refreshTokenUseCase.execute(refreshTokenData);

      // Actualizar cookie si se usa
      if (config.app.env === 'production' && refreshTokenFromCookie) {
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });
      }

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn
        }
      });
    } catch (error) {
      this.logger.error('Error in refresh token service:', error);
      this.handleAuthError(error, res, next);
    }
  }

  /**
   * Maneja el logout de usuarios
   */
  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.debug('Logout request received');

      // Extraer token del header Authorization
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

      // Ejecutar caso de uso
      const result = await this.logoutUseCase.execute(token);

      // Limpiar cookies si existen
      if (req.cookies?.refreshToken) {
        res.clearCookie('refreshToken');
      }

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: {
          loggedOutAt: result.loggedOutAt
        }
      });
    } catch (error) {
      this.logger.error('Error in logout service:', error);
      this.handleAuthError(error, res, next);
    }
  }

  /**
   * Verifica la validez de un token
   */
  public async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.debug('Verify token request received');

      // Extraer token del header Authorization o del body
      const authHeader = req.headers.authorization;
      const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
      const tokenFromBody = req.body.token;
      
      const token = tokenFromHeader || tokenFromBody;

      if (!token) {
        throw new ApplicationError('Token is required');
      }

      // Ejecutar caso de uso
      const result = await this.verifyTokenUseCase.execute(token);

      const statusCode = result.valid ? 200 : 401;

      res.status(statusCode).json({
        status: result.valid ? 'success' : 'error',
        message: result.message,
        data: {
          valid: result.valid,
          user: result.user || null
        }
      });
    } catch (error) {
      this.logger.error('Error in verify token service:', error);
      this.handleAuthError(error, res, next);
    }
  }

  /**
   * Obtiene información del usuario actual desde el token
   */
  public async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.debug('Me request received');

      // Extraer token del header Authorization
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

      if (!token) {
        throw new ApplicationError('Authentication token is required');
      }

      // Verificar token y obtener información del usuario
      const result = await this.verifyTokenUseCase.execute(token);

      if (!result.valid) {
        throw new ApplicationError(result.message);
      }

      res.status(200).json({
        status: 'success',
        message: 'User information retrieved successfully',
        data: {
          user: result.user
        }
      });
    } catch (error) {
      this.logger.error('Error in me service:', error);
      this.handleAuthError(error, res, next);
    }
  }

  /**
   * Maneja errores específicos de autenticación
   */
  private handleAuthError(error: unknown, res: Response, next: NextFunction): void {
    if (error instanceof ApplicationError ||
        error instanceof DomainError ||
        error instanceof InfrastructureError) {

      // Determinar código de estado basado en el mensaje de error
      let statusCode = 400;
      
      if (error.message.includes('Invalid email or password') ||
          error.message.includes('Invalid or expired token') ||
          error.message.includes('Authentication token is required') ||
          error.message.includes('not active') ||
          error.message.includes('locked')) {
        statusCode = 401;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('locked')) {
        statusCode = 423; // Locked
      }

      res.status(statusCode).json({
        status: 'error',
        message: error.message
      });
      return;
    }

    // Error no manejado, pasar al middleware de manejo de errores
    next(error);
  }
}