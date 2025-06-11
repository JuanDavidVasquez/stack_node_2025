// src/application/use-cases/auth/login.use-case.ts
import { JwtAdapter, JwtPayload } from '../../../infrastructure/adaptadores';
import { ApplicationError } from '../../../shared/errors/application.error';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { LoginResponseDTO } from '../../dtos/response/auth/auth-response.dto';
import { AuthMapper } from '../../../infrastructure/repositories/mappers/auth.mapper';
import { ZodError } from 'zod';
import { AuthRepository } from '../../../domain/entities/auth.repository';
import { validateLoginRequest } from '../../dtos';

/**
 * Caso de uso para autenticación de usuarios (login)
 */
export class LoginUseCase {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/use-cases`,
  });

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtAdapter: JwtAdapter
  ) {}

  /**
   * Ejecuta el caso de uso de login
   * @param rawLoginData Datos sin validar para el login
   * @param ipAddress IP del cliente (opcional)
   * @param userAgent User agent del cliente (opcional)
   * @returns Datos del usuario autenticado con tokens
   */
  async execute(
    rawLoginData: unknown, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<LoginResponseDTO> {
    try {
      // Validar entrada con Zod
      const loginData = validateLoginRequest(rawLoginData);
      
      this.logger.info(`Login attempt for email: ${loginData.email}`);

      // Autenticar usuario
      const auth = await this.authRepository.authenticateUser(
        loginData.email, 
        loginData.password
      );

      // Registrar intento de login
      const isSuccess = auth !== null;
      await this.authRepository.recordLoginAttempt(
        loginData.email, 
        isSuccess, 
        ipAddress, 
        userAgent
      );

      if (!auth) {
        this.logger.warn(`Login failed for email: ${loginData.email}`);
        throw new ApplicationError('Invalid email or password');
      }

      // Verificar si la cuenta está bloqueada
      if (auth.isLocked()) {
        const minutesUntilUnlock = auth.getMinutesUntilUnlock();
        this.logger.warn(`Login attempt on locked account: ${loginData.email}`);
        throw new ApplicationError(
          `Account is locked. Try again in ${minutesUntilUnlock} minutes.`
        );
      }

      // Verificar si la cuenta está activa
      if (!auth.isActive) {
        this.logger.warn(`Login attempt on inactive account: ${loginData.email}`);
        throw new ApplicationError('Account is not active. Please verify your email.');
      }

      // Generar tokens JWT
      const jwtPayload = AuthMapper.toJwtPayload(auth) as JwtPayload;
      
      // Determinar tiempo de expiración basado en "Remember Me"
      const accessTokenExpiry = loginData.rememberMe ? '7d' : config.jwt.expiresIn;
      const refreshTokenExpiry = loginData.rememberMe ? '30d' : config.jwt.refreshExpiresIn;

      const tokens = await this.jwtAdapter.generateTokenPair(jwtPayload);

      this.logger.info(`User logged in successfully: ${auth.email}`);

      // Preparar respuesta
      const userResponse = AuthMapper.toResponseDTO(auth);

      return {
        user: userResponse,
        tokens,
        expiresIn: accessTokenExpiry,
        message: 'Login successful'
      };

    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new ApplicationError(`Validation failed: ${errorMessages}`);
      }
      
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('Error in login use case:', error);
      throw new ApplicationError(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}