// src/application/use-cases/user/get-user.use-case.ts
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ApplicationError } from '../../../shared/errors/application.error';
import { GetUserRequestDTO } from '../../dtos/request/user/get-user-request.dto';
import { UserResponseDTO } from '../../dtos/response/user/user-response.dto';
import { setupLogger } from '../../../infrastructure/utils/logger';
import { config } from '../../../infrastructure/database/config/env';
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
    private readonly uuidAdapter: UuidAdapter
  ) {}

  /**
   * Ejecuta el caso de uso
   * @param requestDTO DTO con el ID del usuario a obtener
   * @returns Datos del usuario encontrado
   * @throws ApplicationError si el usuario no existe o el ID no es válido
   */
  async execute(requestDTO: GetUserRequestDTO): Promise<UserResponseDTO> {
    try {
      this.logger.info(`Getting user with ID: ${requestDTO.id}`);

      // Validar que el ID sea un UUID válido
      if (!this.uuidAdapter.validate(requestDTO.id)) {
        this.logger.warn(`Invalid user ID format: ${requestDTO.id}`);
        throw new ApplicationError('Invalid user ID format');
      }

      // Buscar el usuario en el repositorio
      const user = await this.userRepository.findById(requestDTO.id);

      // Verificar si el usuario existe
      if (!user) {
        this.logger.warn(`User with ID ${requestDTO.id} not found`);
        throw new ApplicationError(`User with ID ${requestDTO.id} not found`);
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
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error(`Error getting user with ID ${requestDTO.id}:`, error);
      throw new ApplicationError(`Error getting user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}