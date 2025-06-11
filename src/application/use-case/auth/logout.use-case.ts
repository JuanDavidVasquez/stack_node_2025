// src/application/use-cases/auth/logout.use-case.ts
import { JwtAdapter } from '../../../infrastructure/adaptadores';
import { ApplicationError } from '../../../shared/errors/application.error';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { LogoutResponseDTO } from '../../dtos/response/auth/auth-response.dto';
import { ZodError } from 'zod';

/**
 * Caso de uso para logout de usuarios
 */
export class LogoutUseCase {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/use-cases`,
  });

  constructor(
    private readonly jwtAdapter: JwtAdapter
  ) {}

  /**
   * Ejecuta el caso de uso de logout
   * @param token Token de acceso del usuario (del header Authorization)
   * @returns Confirmación de logout
   */
  async execute(token?: string): Promise<LogoutResponseDTO> {
    try {
      this.logger.debug('Processing logout request');

      let userEmail = 'unknown';

      // Si se proporciona token, verificarlo para obtener información del usuario
      if (token) {
        try {
          const payload = await this.jwtAdapter.verify(token);
          userEmail = payload.email || 'unknown';
          this.logger.info(`User logout: ${userEmail}`);
        } catch (error) {
          // El token puede estar expirado o ser inválido, pero el logout debe proceder
          this.logger.warn('Invalid token provided for logout, proceeding anyway');
        }
      }

      // En un sistema más avanzado, aquí podrías:
      // 1. Agregar el token a una blacklist
      // 2. Invalidar sesiones en base de datos
      // 3. Notificar a otros servicios
      // 4. Limpiar cookies, etc.

      const logoutTime = new Date();

      this.logger.info(`Logout successful for user: ${userEmail}`);

      return {
        message: 'Logout successful',
        loggedOutAt: logoutTime
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

      this.logger.error('Error in logout use case:', error);
      throw new ApplicationError(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}