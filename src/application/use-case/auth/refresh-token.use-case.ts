// src/application/use-cases/auth/refresh-token.use-case.ts
import { JwtAdapter } from '../../../infrastructure/adaptadores';
import { ApplicationError } from '../../../shared/errors/application.error';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { RefreshTokenResponseDTO } from '../../dtos/response/auth/auth-response.dto';
import { AuthMapper } from '../../../infrastructure/repositories/mappers/auth.mapper';
import { ZodError } from 'zod';
import { AuthRepository } from '../../../domain/entities/auth.repository';
import { validateRefreshTokenRequest } from '../../dtos';

/**
 * Caso de uso para refrescar tokens de acceso
 */
export class RefreshTokenUseCase {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/use-cases`,
  });

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtAdapter: JwtAdapter
  ) {}

  /**
   * Ejecuta el caso de uso de refresh token
   * @param rawRefreshData Datos sin validar con el refresh token
   * @returns Nuevos tokens de acceso
   */
  async execute(rawRefreshData: unknown): Promise<RefreshTokenResponseDTO> {
    try {
      // Validar entrada con Zod
      const refreshData = validateRefreshTokenRequest(rawRefreshData);
      
      this.logger.debug('Refreshing access token');

      // Verificar el refresh token
      const payload = await this.jwtAdapter.verify(refreshData.refreshToken);
      
      if (!payload.sub) {
        throw new ApplicationError('Invalid refresh token payload');
      }

      // Buscar información del usuario
      const auth = await this.authRepository.findByUserId(payload.sub);
      
      if (!auth) {
        this.logger.warn(`User not found for refresh token: ${payload.sub}`);
        throw new ApplicationError('User not found');
      }

      // Verificar que el usuario sigue activo
      if (!auth.isActive) {
        this.logger.warn(`Refresh token attempt for inactive user: ${auth.email}`);
        throw new ApplicationError('Account is not active');
      }

      // Verificar que la cuenta no esté bloqueada
      if (auth.isLocked()) {
        const minutesUntilUnlock = auth.getMinutesUntilUnlock();
        this.logger.warn(`Refresh token attempt for locked user: ${auth.email}`);
        throw new ApplicationError(
          `Account is locked. Try again in ${minutesUntilUnlock} minutes.`
        );
      }

      // Generar nuevos tokens
      const newJwtPayload = AuthMapper.toJwtPayload(auth) as { sub: string; email: string; role: string };
      const newTokens = await this.jwtAdapter.generateTokenPair(newJwtPayload);

      this.logger.info(`Tokens refreshed successfully for user: ${auth.email}`);

      return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: config.jwt.expiresIn,
        message: 'Tokens refreshed successfully'
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

      // Manejar errores específicos de JWT
      if (error instanceof Error && error.message.includes('Token')) {
        this.logger.warn('Invalid refresh token provided');
        throw new ApplicationError('Invalid or expired refresh token');
      }

      this.logger.error('Error in refresh token use case:', error);
      throw new ApplicationError(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}