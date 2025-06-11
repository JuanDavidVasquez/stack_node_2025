// src/application/use-cases/auth/verify-token.use-case.ts
import { JwtAdapter } from '../../../infrastructure/adaptadores';
import { ApplicationError } from '../../../shared/errors/application.error';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { VerifyTokenResponseDTO } from '../../dtos/response/auth/auth-response.dto';
import { AuthMapper } from '../../../infrastructure/repositories/mappers/auth.mapper';
import { AuthRepository } from '../../../domain/entities/auth.repository';

/**
 * Caso de uso para verificar tokens de acceso
 */
export class VerifyTokenUseCase {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/use-cases`,
  });

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtAdapter: JwtAdapter
  ) {}

  /**
   * Ejecuta el caso de uso de verificación de token
   * @param token Token a verificar
   * @returns Información sobre la validez del token y datos del usuario
   */
  async execute(token: string): Promise<VerifyTokenResponseDTO> {
    try {
      this.logger.debug('Verifying token');

      if (!token) {
        return {
          valid: false,
          message: 'No token provided'
        };
      }

      // Verificar el token JWT
      const payload = await this.jwtAdapter.verify(token);
      
      if (!payload.sub) {
        return {
          valid: false,
          message: 'Invalid token payload'
        };
      }

      // Buscar información del usuario
      const auth = await this.authRepository.findByUserId(payload.sub);
      
      if (!auth) {
        this.logger.warn(`User not found for token verification: ${payload.sub}`);
        return {
          valid: false,
          message: 'User not found'
        };
      }

      // Verificar que el usuario sigue activo
      if (!auth.isActive) {
        this.logger.warn(`Token verification for inactive user: ${auth.email}`);
        return {
          valid: false,
          message: 'Account is not active'
        };
      }

      // Verificar que la cuenta no esté bloqueada
      if (auth.isLocked()) {
        const minutesUntilUnlock = auth.getMinutesUntilUnlock();
        this.logger.warn(`Token verification for locked user: ${auth.email}`);
        return {
          valid: false,
          message: `Account is locked. Try again in ${minutesUntilUnlock} minutes.`
        };
      }

      // Token válido
      const userResponse = AuthMapper.toResponseDTO(auth);

      this.logger.debug(`Token verified successfully for user: ${auth.email}`);

      return {
        valid: true,
        user: userResponse,
        message: 'Token is valid'
      };

    } catch (error) {
      // Manejar errores específicos de JWT
      if (error instanceof Error && 
          (error.message.includes('expired') || 
           error.message.includes('invalid') ||
           error.message.includes('Token'))) {
        this.logger.debug('Invalid or expired token provided');
        return {
          valid: false,
          message: 'Invalid or expired token'
        };
      }

      this.logger.error('Error in verify token use case:', error);
      return {
        valid: false,
        message: 'Token verification failed'
      };
    }
  }
}