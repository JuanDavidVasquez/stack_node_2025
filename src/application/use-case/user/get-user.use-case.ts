// src/application/use-cases/user/get-user.use-case.ts
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ApplicationError } from '../../../shared/errors/application.error';
import { UserResponseDTO } from '../../dtos/response/user/user-response.dto';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
import { ZodError } from 'zod';
import { validateUserData } from '../../shemas/user.shemas';
import { UuidAdapter } from '../../../infrastructure/adaptadores';

/**
 * Caso de uso para obtener información de un usuario por su ID
 */
export class GetUserUseCase {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/use-cases`,
  });

  constructor(
    private readonly userRepository: UserRepository,
    private readonly uuidAdapter: UuidAdapter,
  ) {}

  /**
   * Ejecuta el caso de uso
   * @param rawData Datos sin validar con el ID del usuario
   * @returns Datos del usuario encontrado
   * @throws ApplicationError si el usuario no existe o el ID no es válido
   */
  async execute(rawData: unknown): Promise<UserResponseDTO> {
    try {
      // Validar entrada con Zod
      const { id } = validateUserData.userIdParam(rawData);
      
      this.logger.info(`Getting user with ID: ${id}`);

      // Buscar el usuario en el repositorio
      const user = await this.userRepository.findById(id);

      // Verificar si el usuario existe
      if (!user) {
        this.logger.warn(`User with ID ${id} not found`);
        throw new ApplicationError(`User with ID ${id} not found`);
      }

      this.logger.info(`User found: ${user.id}`);

      // Mapear la entidad a DTO de respuesta
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
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

      this.logger.error(`Error getting user:`, error);
      throw new ApplicationError(`Error getting user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
